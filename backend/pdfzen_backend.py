#!/usr/bin/env python3
"""
PDFZen Backend - Handles PDF operations for the TUI frontend.
All external dependencies are bundled via pip packages.
"""

import argparse
import json
import sys
import os
import tempfile
from pathlib import Path
from typing import Optional

# Lazy imports to speed up CLI startup
def get_fitz():
    import fitz  # PyMuPDF
    return fitz

def get_pikepdf():
    import pikepdf
    return pikepdf

def get_pil():
    from PIL import Image
    return Image


def output_json(success: bool, data: Optional[dict] = None, error: Optional[str] = None):
    """Output JSON result to stdout"""
    result = {"success": success}
    if data:
        result.update(data)
    if error:
        result["error"] = error
    print(json.dumps(result))
    sys.exit(0 if success else 1)


def cmd_pdf_to_images(args):
    """Convert PDF pages to images"""
    try:
        fitz = get_fitz()
        
        doc = fitz.open(args.input)
        os.makedirs(args.output_dir, exist_ok=True)
        
        base_name = Path(args.input).stem
        output_files = []
        
        # Determine which pages to convert
        pages = range(len(doc))
        if args.pages:
            pages = [int(p) - 1 for p in args.pages.split(",") if p.strip()]
            pages = [p for p in pages if 0 <= p < len(doc)]
        
        # DPI to zoom factor (72 DPI is base)
        zoom = args.dpi / 72
        matrix = fitz.Matrix(zoom, zoom)
        
        for page_num in pages:
            page = doc[page_num]
            pix = page.get_pixmap(matrix=matrix)
            
            ext = args.format.lower()
            output_path = os.path.join(args.output_dir, f"{base_name}_page_{page_num + 1}.{ext}")
            
            if ext == "jpg" or ext == "jpeg":
                pix.save(output_path, "jpeg")
            else:
                pix.save(output_path, "png")
            
            output_files.append(output_path)
        
        doc.close()
        output_json(True, {"outputFiles": output_files, "totalImages": len(output_files)})
        
    except Exception as e:
        output_json(False, error=str(e))


def cmd_images_to_pdf(args):
    """Convert images to a single PDF"""
    temp_files = []  # Track temp files for cleanup
    try:
        fitz = get_fitz()
        Image = get_pil()
        
        doc = fitz.open()
        image_paths = args.inputs.split("|")
        
        for img_path in image_paths:
            if not os.path.exists(img_path):
                continue
                
            # Open with PIL to get dimensions and convert if needed
            img = Image.open(img_path)
            
            # Convert to RGB if necessary (e.g., RGBA PNGs)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            
            # Save to secure temp file as JPEG for PyMuPDF
            fd, temp_path = tempfile.mkstemp(suffix=".jpg")
            os.close(fd)  # Close file descriptor, PIL will open it
            temp_files.append(temp_path)
            img.save(temp_path, "JPEG", quality=95)
            img.close()
            
            # Insert into PDF
            img_doc = fitz.open(temp_path)
            rect = img_doc[0].rect
            
            if args.page_size == "a4":
                page = doc.new_page(width=595.28, height=841.89)
            elif args.page_size == "letter":
                page = doc.new_page(width=612, height=792)
            else:  # fit
                page = doc.new_page(width=rect.width, height=rect.height)
            
            # Scale image to fit page if needed
            if args.page_size != "fit":
                scale = min(page.rect.width / rect.width, page.rect.height / rect.height)
                new_width = rect.width * scale
                new_height = rect.height * scale
                x = (page.rect.width - new_width) / 2
                y = (page.rect.height - new_height) / 2
                target_rect = fitz.Rect(x, y, x + new_width, y + new_height)
            else:
                target_rect = page.rect
            
            page.insert_image(target_rect, filename=temp_path)
            img_doc.close()
        
        doc.save(args.output)
        total_pages = len(doc)
        doc.close()
        
        output_json(True, {"outputPath": args.output, "totalPages": total_pages})
        
    except Exception as e:
        output_json(False, error=str(e))
    finally:
        # Cleanup temp files
        for temp_path in temp_files:
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            except:
                pass


def cmd_protect_pdf(args):
    """Add password protection to a PDF"""
    try:
        pikepdf = get_pikepdf()
        
        # Read passwords from stdin if --stdin-secrets is set (security: avoids exposing in process list)
        user_password = args.user_password
        owner_password = args.owner_password
        
        if args.stdin_secrets:
            secrets = json.loads(sys.stdin.read())
            user_password = secrets.get("user_password", "")
            owner_password = secrets.get("owner_password", "")
        
        pdf = pikepdf.open(args.input)
        
        # Build encryption settings
        encryption = pikepdf.Encryption(
            owner=owner_password or user_password or "",
            user=user_password or "",
            allow=pikepdf.Permissions(
                print_lowres=args.allow_print,
                print_highres=args.allow_print,
                modify_other=args.allow_modify,
                modify_annotation=args.allow_annotate,
                modify_form=args.allow_modify,
                modify_assembly=args.allow_modify,
                extract=args.allow_copy,
                accessibility=True,
            )
        )
        
        pdf.save(args.output, encryption=encryption)
        pdf.close()
        
        output_json(True, {"outputPath": args.output})
        
    except Exception as e:
        output_json(False, error=str(e))


def cmd_unprotect_pdf(args):
    """Remove password protection from a PDF"""
    try:
        pikepdf = get_pikepdf()
        
        # Read password from stdin if --stdin-secrets is set (security: avoids exposing in process list)
        password = args.password
        if args.stdin_secrets:
            secrets = json.loads(sys.stdin.read())
            password = secrets.get("password", "")
        
        pdf = pikepdf.open(args.input, password=password)
        pdf.save(args.output)
        pdf.close()
        
        output_json(True, {"outputPath": args.output})
        
    except Exception as e:
        output_json(False, error=str(e))


def cmd_compress_pdf(args):
    """Compress a PDF file"""
    try:
        fitz = get_fitz()
        Image = get_pil()
        import io
        
        original_size = os.path.getsize(args.input)
        
        doc = fitz.open(args.input)
        
        # Compress images in the PDF
        for page_num in range(len(doc)):
            page = doc[page_num]
            image_list = page.get_images(full=True)
            
            for img_info in image_list:
                xref = img_info[0]
                try:
                    base_image = doc.extract_image(xref)
                    if base_image and base_image.get("image"):
                        img_bytes = base_image["image"]
                        img_ext = base_image.get("ext", "png")
                        
                        # Skip if already JPEG (already compressed)
                        if img_ext.lower() in ["jpeg", "jpg"]:
                            continue
                        
                        # Re-compress large images as JPEG
                        if len(img_bytes) > 50000:  # Only compress images > 50KB
                            pil_img = Image.open(io.BytesIO(img_bytes))
                            if pil_img.mode in ("RGBA", "P"):
                                pil_img = pil_img.convert("RGB")
                            
                            # Compress to JPEG
                            buffer = io.BytesIO()
                            pil_img.save(buffer, format="JPEG", quality=75, optimize=True)
                            compressed_bytes = buffer.getvalue()
                            
                            # Only use if actually smaller
                            if len(compressed_bytes) < len(img_bytes):
                                # Replace image in document
                                doc.update_stream(xref, compressed_bytes)
                except Exception:
                    pass  # Skip problematic images
        
        # Save with optimal compression settings from PyMuPDF docs
        doc.save(
            args.output,
            garbage=4,  # Maximum garbage collection (removes unused & dedupes streams)
            deflate=True,  # Compress uncompressed streams
            deflate_images=True,  # Compress uncompressed images
            deflate_fonts=True,  # Compress uncompressed fonts
            clean=True,  # Clean/sanitize content streams
        )
        doc.close()
        
        compressed_size = os.path.getsize(args.output)
        ratio = ((1 - compressed_size / original_size) * 100) if original_size > 0 else 0
        
        output_json(True, {
            "outputPath": args.output,
            "originalSize": original_size,
            "compressedSize": compressed_size,
            "compressionRatio": f"{ratio:.2f}%"
        })
        
    except Exception as e:
        output_json(False, error=str(e))


def cmd_check_deps(args):
    """Check if all dependencies are available"""
    deps = {}
    
    try:
        import fitz
        deps["pymupdf"] = {"installed": True, "version": fitz.version[0]}
    except ImportError:
        deps["pymupdf"] = {"installed": False}
    
    try:
        import pikepdf
        deps["pikepdf"] = {"installed": True, "version": pikepdf.__version__}
    except ImportError:
        deps["pikepdf"] = {"installed": False}
    
    try:
        import PIL
        deps["pillow"] = {"installed": True, "version": PIL.__version__}
    except ImportError:
        deps["pillow"] = {"installed": False}
    
    all_installed = all(d["installed"] for d in deps.values())
    output_json(all_installed, {"dependencies": deps})


def cmd_install_deps(args):
    """Install missing dependencies into a virtual environment"""
    import subprocess
    
    try:
        backend_dir = Path(__file__).parent
        venv_path = backend_dir / ".venv"
        
        # Create virtual environment if it doesn't exist
        if not venv_path.exists():
            result = subprocess.run(
                [sys.executable, "-m", "venv", str(venv_path)],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                output_json(False, error=f"Failed to create venv: {result.stderr}")
                return
        
        # Determine pip path
        if sys.platform == "win32":
            pip_path = venv_path / "Scripts" / "pip"
        else:
            pip_path = venv_path / "bin" / "pip"
        
        # Install requirements
        result = subprocess.run(
            [str(pip_path), "install", "-q", "-r", str(backend_dir / "requirements.txt")],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            output_json(True, {"message": "Dependencies installed successfully", "venv": str(venv_path)})
        else:
            output_json(False, error=result.stderr or "Failed to install dependencies")
            
    except Exception as e:
        output_json(False, error=str(e))


def main():
    parser = argparse.ArgumentParser(description="PDFZen Backend")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # pdf-to-images
    p_to_img = subparsers.add_parser("pdf-to-images", help="Convert PDF to images")
    p_to_img.add_argument("--input", required=True, help="Input PDF path")
    p_to_img.add_argument("--output-dir", required=True, help="Output directory")
    p_to_img.add_argument("--format", default="png", choices=["png", "jpg", "jpeg"])
    p_to_img.add_argument("--dpi", type=int, default=150)
    p_to_img.add_argument("--pages", help="Comma-separated page numbers (1-indexed)")
    p_to_img.set_defaults(func=cmd_pdf_to_images)
    
    # images-to-pdf
    img_to_p = subparsers.add_parser("images-to-pdf", help="Convert images to PDF")
    img_to_p.add_argument("--inputs", required=True, help="Pipe-separated image paths")
    img_to_p.add_argument("--output", required=True, help="Output PDF path")
    img_to_p.add_argument("--page-size", default="fit", choices=["fit", "a4", "letter"])
    img_to_p.set_defaults(func=cmd_images_to_pdf)
    
    # protect
    protect = subparsers.add_parser("protect", help="Add password protection")
    protect.add_argument("--input", required=True, help="Input PDF path")
    protect.add_argument("--output", required=True, help="Output PDF path")
    protect.add_argument("--user-password", help="Password to open PDF")
    protect.add_argument("--owner-password", help="Password to modify PDF")
    protect.add_argument("--allow-print", action="store_true", default=True)
    protect.add_argument("--allow-copy", action="store_true", default=True)
    protect.add_argument("--allow-modify", action="store_true", default=True)
    protect.add_argument("--allow-annotate", action="store_true", default=True)
    protect.add_argument("--stdin-secrets", action="store_true", help="Read passwords from stdin as JSON")
    protect.set_defaults(func=cmd_protect_pdf)
    
    # unprotect
    unprotect = subparsers.add_parser("unprotect", help="Remove password protection")
    unprotect.add_argument("--input", required=True, help="Input PDF path")
    unprotect.add_argument("--output", required=True, help="Output PDF path")
    unprotect.add_argument("--password", help="PDF password")
    unprotect.add_argument("--stdin-secrets", action="store_true", help="Read password from stdin as JSON")
    unprotect.set_defaults(func=cmd_unprotect_pdf)
    
    # compress
    compress = subparsers.add_parser("compress", help="Compress PDF")
    compress.add_argument("--input", required=True, help="Input PDF path")
    compress.add_argument("--output", required=True, help="Output PDF path")
    compress.set_defaults(func=cmd_compress_pdf)
    
    # check-deps
    check = subparsers.add_parser("check-deps", help="Check dependencies")
    check.set_defaults(func=cmd_check_deps)
    
    # install-deps
    install = subparsers.add_parser("install-deps", help="Install dependencies")
    install.set_defaults(func=cmd_install_deps)
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    args.func(args)


if __name__ == "__main__":
    main()
