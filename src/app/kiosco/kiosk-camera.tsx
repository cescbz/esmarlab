"use client";

import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { Camera, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

async function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const max = 640;
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("No se pudo procesar la imagen."));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    image.onerror = () => reject(new Error("Imagen inválida."));
    image.src = dataUrl;
  });
}

export function KioskCamera({
  onChange,
  required,
}: {
  onChange: (value: string | null) => void;
  required: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startCamera() {
    setError(null);
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
    } catch {
      setError("No pudimos abrir la cámara. Verificá el permiso del navegador.");
      setActive(false);
    } finally {
      setStarting(false);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const raw = canvas.toDataURL("image/jpeg", 0.8);
    const compressed = await compressImage(raw);
    setPhoto(compressed);
    onChange(compressed);
    stopCamera();
  }

  function retake() {
    setPhoto(null);
    onChange(null);
    setError(null);
    void startCamera();
  }

  return (
    <div className="space-y-2">
      {photo ? (
        <div className="space-y-2">
          <NextImage
            src={photo}
            alt="Foto de la marca"
            width={640}
            height={480}
            unoptimized
            className="h-48 w-full rounded-lg object-cover"
          />
          <Button type="button" variant="outline" className="w-full" onClick={retake}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Repetir foto
          </Button>
        </div>
      ) : active ? (
        <div className="space-y-2">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-48 w-full rounded-lg bg-black object-cover"
          />
          <Button type="button" className="w-full" onClick={capture}>
            <Camera className="mr-1.5 h-4 w-4" />
            Tomar foto
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Button type="button" className="w-full" onClick={startCamera} disabled={starting}>
            {starting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-1.5 h-4 w-4" />
            )}
            {starting ? "Abriendo cámara..." : "Activar cámara"}
          </Button>
          {error ? <p className="text-xs text-amber-700">{error}</p> : null}
          {required ? (
            <p className="text-[11px] text-muted-foreground">La foto es obligatoria.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
