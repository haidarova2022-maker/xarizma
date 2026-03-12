"""Google Drive integration: list, download, upload files."""

import logging
from datetime import datetime
from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload

import config

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/drive"]


def _get_service():
    """Build Google Drive API service using service account credentials."""
    creds = service_account.Credentials.from_service_account_file(
        config.GOOGLE_SERVICE_ACCOUNT_PATH, scopes=SCOPES
    )
    return build("drive", "v3", credentials=creds)


def list_files(folder_id: str) -> list[dict]:
    """List files in a Google Drive folder.

    Returns list of dicts with keys: id, name, mimeType, modifiedTime.
    """
    service = _get_service()
    query = f"'{folder_id}' in parents and trashed = false"
    results = (
        service.files()
        .list(q=query, fields="files(id, name, mimeType, modifiedTime)", orderBy="modifiedTime desc")
        .execute()
    )
    return results.get("files", [])


def get_subfolders(parent_folder_id: str) -> dict[str, str]:
    """Get subfolder name→id mapping inside a parent folder."""
    service = _get_service()
    query = (
        f"'{parent_folder_id}' in parents "
        "and mimeType = 'application/vnd.google-apps.folder' "
        "and trashed = false"
    )
    results = (
        service.files()
        .list(q=query, fields="files(id, name)")
        .execute()
    )
    return {f["name"]: f["id"] for f in results.get("files", [])}


def get_new_files(folder_id: str, since_date: datetime | None = None) -> list[dict]:
    """Get files modified after since_date. If None, returns all files."""
    files = list_files(folder_id)
    if since_date is None:
        return files

    cutoff = since_date.isoformat() + "Z"
    return [f for f in files if f.get("modifiedTime", "") >= cutoff]


def download_file(file_id: str, dest_path: Path) -> Path:
    """Download a file from Google Drive to local path."""
    import io

    service = _get_service()
    request = service.files().get_media(fileId=file_id)
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    with open(dest_path, "wb") as fh:
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()

    logger.info("Downloaded: %s", dest_path.name)
    return dest_path


def download_google_sheet(file_id: str, dest_path: Path) -> Path:
    """Export a Google Sheet as .xlsx and save locally."""
    service = _get_service()
    request = service.files().export_media(
        fileId=file_id,
        mimeType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    dest_path = dest_path.with_suffix(".xlsx")
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    import io

    with open(dest_path, "wb") as fh:
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()

    logger.info("Exported Google Sheet: %s", dest_path.name)
    return dest_path


def upload_file(local_path: Path, folder_id: str, filename: str | None = None) -> str:
    """Upload a file to Google Drive folder. Returns the file ID."""
    service = _get_service()
    name = filename or local_path.name

    # Determine MIME type
    suffix = local_path.suffix.lower()
    mime_map = {
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".pdf": "application/pdf",
        ".html": "text/html",
    }
    mime_type = mime_map.get(suffix, "application/octet-stream")

    file_metadata = {"name": name, "parents": [folder_id]}
    media = MediaFileUpload(str(local_path), mimetype=mime_type)

    uploaded = (
        service.files()
        .create(body=file_metadata, media_body=media, fields="id, webViewLink")
        .execute()
    )

    logger.info("Uploaded: %s → %s", name, uploaded.get("webViewLink", uploaded["id"]))
    return uploaded["id"]


def get_file_link(file_id: str) -> str:
    """Get web view link for a file."""
    service = _get_service()
    file_info = service.files().get(fileId=file_id, fields="webViewLink").execute()
    return file_info.get("webViewLink", f"https://drive.google.com/file/d/{file_id}/view")
