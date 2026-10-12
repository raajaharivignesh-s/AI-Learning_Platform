import os
import subprocess
import logging
from typing import List
from sqlalchemy.orm import Session
from app.models.resource import Resource, ProcessingStatus
from app.models.resource_video import ResourceVideoSegment, VideoSegmentType, SegmentProcessingStatus
from app.services.llm_provider import get_llm_provider

logger = logging.getLogger(__name__)

def check_ffmpeg():
    try:
        subprocess.run(["ffmpeg", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def extract_audio(video_path: str, audio_path: str):
    cmd = [
        "ffmpeg", "-y", "-i", video_path, 
        "-vn", "-acodec", "libmp3lame", "-q:a", "2", 
        audio_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

from app.core.config import settings

def extract_keyframes(video_path: str, output_dir: str, interval: int = None) -> List[dict]:
    """
    Extract one frame every `interval` seconds.
    """
    if interval is None:
        interval = settings.FFMPEG_FRAME_INTERVAL_SECONDS
    os.makedirs(output_dir, exist_ok=True)
    # Extract frames at a specific rate: e.g. 1/60 frames per second = 1 frame every 60 seconds
    cmd = [
        "ffmpeg", "-y", "-i", video_path,
        "-vf", f"fps=1/{interval}",
        "-frame_pts", "true",
        os.path.join(output_dir, "frame_%d.jpg")
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    
    # We need to map extracted files to their timestamps.
    # The output filename will be frame_<pts>.jpg but pts is scaled by the timebase.
    # Actually, simpler:
    # ffmpeg -i in.mp4 -vf fps=1/60 out%03d.jpg
    # Then out001.jpg is at 0s (or 30s), out002.jpg at 60s etc.
    # Let's do a more robust way:
    cmd2 = [
        "ffmpeg", "-y", "-i", video_path,
        "-vf", f"fps=1/{interval}",
        os.path.join(output_dir, "frame_%04d.jpg")
    ]
    subprocess.run(cmd2, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    
    frames = []
    # Sort files to ensure order
    files = sorted([f for f in os.listdir(output_dir) if f.startswith("frame_") and f.endswith(".jpg")])
    for i, file in enumerate(files):
        # Frame 1 is at 0s, Frame 2 is at 60s, etc. (Approximate)
        timestamp = i * interval
        frames.append({
            "path": os.path.join(output_dir, file),
            "filename": file,
            "timestamp": float(timestamp)
        })
    return frames

def process_video_resource(db: Session, resource: Resource):
    if not check_ffmpeg():
        logger.error("FFmpeg is not installed or not in PATH.")
        resource.processing_status = ProcessingStatus.failed
        resource.error_details = "FFmpeg is required for video processing."
        db.commit()
        return

    try:
        video_path = resource.stored_filename
        base_dir = os.path.dirname(video_path)
        resource_id_str = str(resource.id)
        audio_path = os.path.join(base_dir, f"{resource_id_str}_audio.mp3")
        frames_dir = os.path.join(base_dir, f"{resource_id_str}_frames")
        
        llm = get_llm_provider()
        
        # 1. Extract and Process Audio
        try:
            extract_audio(video_path, audio_path)
            transcripts = llm.generate_video_transcript(audio_path)
            for seg in transcripts:
                db_seg = ResourceVideoSegment(
                    resource_id=resource.id,
                    segment_type=VideoSegmentType.transcript,
                    start_time=seg["start"],
                    end_time=seg["end"],
                    text_content=seg["text"],
                    processing_status=SegmentProcessingStatus.completed
                )
                db.add(db_seg)
        except Exception as e:
            logger.error(f"Error processing audio for video {resource.id}: {e}")
            # Do not fail the whole resource if audio fails, maybe there's no audio track
            pass
        finally:
            if os.path.exists(audio_path):
                os.remove(audio_path)
                
        # 2. Extract and Process Keyframes
        try:
            interval = settings.FFMPEG_FRAME_INTERVAL_SECONDS
            frames = extract_keyframes(video_path, frames_dir, interval=interval)
            for frame in frames:
                try:
                    desc = llm.generate_image_description(frame["path"])
                    db_seg = ResourceVideoSegment(
                        resource_id=resource.id,
                        segment_type=VideoSegmentType.frame,
                        start_time=frame["timestamp"],
                        end_time=frame["timestamp"] + interval, # Approximate duration
                        text_content=desc,
                        image_filename=frame["path"],
                        processing_status=SegmentProcessingStatus.completed
                    )
                    db.add(db_seg)
                except Exception as e:
                    logger.error(f"Error processing frame {frame['path']} for video {resource.id}: {e}")
                    db_seg = ResourceVideoSegment(
                        resource_id=resource.id,
                        segment_type=VideoSegmentType.frame,
                        start_time=frame["timestamp"],
                        end_time=frame["timestamp"] + interval,
                        image_filename=frame["path"],
                        processing_status=SegmentProcessingStatus.failed,
                        error_details=str(e)
                    )
                    db.add(db_seg)
        except Exception as e:
            logger.error(f"Error extracting keyframes for video {resource.id}: {e}")
            
        resource.processing_status = ProcessingStatus.completed
        db.commit()
    except Exception as e:
        logger.error(f"Failed to process video {resource.id}: {e}")
        resource.processing_status = ProcessingStatus.failed
        resource.error_details = str(e)
        db.commit()
