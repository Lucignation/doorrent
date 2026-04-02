import { useEffect, useRef, useState } from "react";

interface SignaturePadProps {
  onChange?: (signatureData: string) => void;
}

interface Point {
  x: number;
  y: number;
}

export default function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const signatureDataRef = useRef("");
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const activeTouchIdRef = useRef<number | null>(null);
  const lastPointRef = useRef<Point | null>(null);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return undefined;
    }

    const canvasElement = canvas;
    const drawingContext = context;
    const devicePixelRatio = window.devicePixelRatio || 1;

    function syncCanvasSize() {
      const bounds = canvasElement.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));

      canvasElement.width = Math.round(width * devicePixelRatio);
      canvasElement.height = Math.round(height * devicePixelRatio);
      drawingContext.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      drawingContext.clearRect(0, 0, width, height);
      drawingContext.strokeStyle = "#1A1916";
      drawingContext.lineWidth = 2;
      drawingContext.lineCap = "round";
      drawingContext.lineJoin = "round";

      if (signatureDataRef.current) {
        const image = new Image();
        image.onload = () => {
          drawingContext.drawImage(image, 0, 0, width, height);
        };
        image.src = signatureDataRef.current;
      }
    }

    syncCanvasSize();

    function pointFromClient(clientX: number, clientY: number) {
      const rect = canvasElement.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function findTrackedTouch(touches: TouchList) {
      const activeTouchId = activeTouchIdRef.current;

      if (activeTouchId === null) {
        return touches[0] ?? null;
      }

      for (let index = 0; index < touches.length; index += 1) {
        if (touches[index]?.identifier === activeTouchId) {
          return touches[index] ?? null;
        }
      }

      return null;
    }

    function beginStroke(point: Point) {
      drawingRef.current = true;
      lastPointRef.current = point;
      drawingContext.beginPath();
      drawingContext.moveTo(point.x, point.y);
      drawingContext.lineTo(point.x + 0.01, point.y + 0.01);
      drawingContext.stroke();
      hasInkRef.current = true;
      setHasInk(true);
    }

    function extendStroke(point: Point) {
      if (!drawingRef.current) {
        return;
      }

      drawingContext.lineTo(point.x, point.y);
      drawingContext.stroke();
      lastPointRef.current = point;
      hasInkRef.current = true;
      setHasInk(true);
    }

    function finishStroke() {
      if (drawingRef.current && hasInkRef.current) {
        const signatureData = canvasElement.toDataURL("image/png");
        signatureDataRef.current = signatureData;
        onChange?.(signatureData);
      }

      drawingRef.current = false;
      activePointerIdRef.current = null;
      activeTouchIdRef.current = null;
      lastPointRef.current = null;
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === "touch") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      activePointerIdRef.current = event.pointerId;
      try {
        canvasElement.setPointerCapture?.(event.pointerId);
      } catch {}
      beginStroke(pointFromClient(event.clientX, event.clientY));
    }

    function onPointerMove(event: PointerEvent) {
      if (
        event.pointerType === "touch" ||
        !drawingRef.current ||
        activePointerIdRef.current !== event.pointerId
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const coalescedEvents = event.getCoalescedEvents?.();

      if (coalescedEvents?.length) {
        for (const entry of coalescedEvents) {
          extendStroke(pointFromClient(entry.clientX, entry.clientY));
        }
        return;
      }

      extendStroke(pointFromClient(event.clientX, event.clientY));
    }

    function stopPointerDrawing(event?: PointerEvent) {
      if (event) {
        if (event.pointerType === "touch") {
          return;
        }

        if (
          activePointerIdRef.current !== null &&
          event.pointerId !== activePointerIdRef.current
        ) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        try {
          canvasElement.releasePointerCapture?.(event.pointerId);
        } catch {}
      }

      finishStroke();
    }

    function onTouchStart(event: TouchEvent) {
      if (!event.changedTouches.length) {
        return;
      }

      const touch = event.changedTouches[0];

      if (!touch) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      activeTouchIdRef.current = touch.identifier;
      beginStroke(pointFromClient(touch.clientX, touch.clientY));
    }

    function onTouchMove(event: TouchEvent) {
      if (!drawingRef.current) {
        return;
      }

      const touch =
        findTrackedTouch(event.touches) ?? findTrackedTouch(event.changedTouches);

      if (!touch) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      extendStroke(pointFromClient(touch.clientX, touch.clientY));
    }

    function stopTouchDrawing(event?: TouchEvent) {
      if (event) {
        const touch =
          findTrackedTouch(event.changedTouches) ?? findTrackedTouch(event.touches);

        if (!touch && activeTouchIdRef.current !== null) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
      }

      finishStroke();
    }

    canvasElement.addEventListener("pointerdown", onPointerDown);
    canvasElement.addEventListener("pointermove", onPointerMove);
    canvasElement.addEventListener("pointerup", stopPointerDrawing);
    canvasElement.addEventListener("pointercancel", stopPointerDrawing);
    canvasElement.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", stopTouchDrawing, { passive: false });
    window.addEventListener("touchcancel", stopTouchDrawing, { passive: false });
    window.addEventListener("resize", syncCanvasSize);

    return () => {
      canvasElement.removeEventListener("pointerdown", onPointerDown);
      canvasElement.removeEventListener("pointermove", onPointerMove);
      canvasElement.removeEventListener("pointerup", stopPointerDrawing);
      canvasElement.removeEventListener("pointercancel", stopPointerDrawing);
      canvasElement.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", stopTouchDrawing);
      window.removeEventListener("touchcancel", stopTouchDrawing);
      window.removeEventListener("resize", syncCanvasSize);
    };
  }, [onChange]);

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    signatureDataRef.current = "";
    hasInkRef.current = false;
    drawingRef.current = false;
    activePointerIdRef.current = null;
    activeTouchIdRef.current = null;
    lastPointRef.current = null;
    setHasInk(false);
    onChange?.("");
  }

  return (
    <>
      <div className="sign-pad">
        <canvas ref={canvasRef} id="sig-canvas" />
        {!hasInk ? <div className="sign-pad-hint">Sign here with your mouse or touch</div> : null}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
        <button type="button" className="btn btn-ghost btn-xs" onClick={clearSignature}>
          Clear
        </button>
      </div>
    </>
  );
}
