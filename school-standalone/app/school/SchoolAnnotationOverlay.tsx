'use client';

import { useRef, useState, type PointerEvent } from 'react';
import { lessonPoints } from '@/lib/school/lesson';

type Coordinate = { x: number; y: number };

export type SchoolAnnotation =
  | { id: string; page: number; kind: 'pen'; points: Coordinate[] }
  | { id: string; page: number; kind: 'circle' | 'arrow' | 'underline'; elementId: string };

type Props = {
  page: number;
  drawing: boolean;
  annotations: SchoolAnnotation[];
  onDraw: (points: Coordinate[]) => void;
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

/** Transparent, page-relative annotations that remain aligned when PDF.js changes scale. */
export function SchoolAnnotationOverlay({ page, drawing, annotations, onDraw }: Props) {
  const [draft, setDraft] = useState<Coordinate[]>([]);
  const strokeRef = useRef<Coordinate[] | null>(null);

  function position(event: PointerEvent<SVGSVGElement>): Coordinate {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / rect.width),
      y: clamp((event.clientY - rect.top) / rect.height),
    };
  }

  function begin(event: PointerEvent<SVGSVGElement>) {
    if (!drawing || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const first = position(event);
    strokeRef.current = [first];
    setDraft([first]);
  }

  function move(event: PointerEvent<SVGSVGElement>) {
    if (!drawing || !strokeRef.current) return;
    const next = position(event);
    const previous = strokeRef.current[strokeRef.current.length - 1];
    if (Math.hypot(next.x - previous.x, next.y - previous.y) < 0.0015) return;
    strokeRef.current = [...strokeRef.current, next];
    setDraft(strokeRef.current);
  }

  function finish(event: PointerEvent<SVGSVGElement>) {
    if (!strokeRef.current) return;
    if (event.type !== 'pointercancel') {
      const last = position(event);
      const points = [...strokeRef.current, last];
      if (points.length > 1) onDraw(points);
    }
    strokeRef.current = null;
    setDraft([]);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  const shown = annotations.filter((annotation) => annotation.page === page);
  const drawLine = (points: Coordinate[], key: string) => (
    <polyline key={key} points={points.map((point) => `${point.x * 1000},${point.y * 1000}`).join(' ')}
      fill="none" stroke="#e33e48" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
  );

  return <svg
    className={`school-annotation-layer ${drawing ? 'drawing' : ''}`}
    viewBox="0 0 1000 1000"
    preserveAspectRatio="none"
    aria-label={drawing ? 'ارسم بالقلم الأحمر على الصفحة' : 'علامات الشرح على الكتاب'}
    onPointerDown={begin}
    onPointerMove={move}
    onPointerUp={finish}
    onPointerCancel={finish}
  >
    <defs>
      <marker id="school-annotation-arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z" fill="#e33e48" />
      </marker>
    </defs>
    {shown.map((annotation) => {
      if (annotation.kind === 'pen') return drawLine(annotation.points, annotation.id);
      const point = lessonPoints.find((item) => item.id === annotation.elementId && item.page === page);
      if (!point) return null;
      const x = point.x * 1000;
      const y = point.y * 1000;
      if (annotation.kind === 'circle') {
        return <ellipse key={annotation.id} cx={x} cy={y} rx="95" ry="65" fill="#ffdd5420" stroke="#e33e48" strokeWidth="5" vectorEffect="non-scaling-stroke" />;
      }
      if (annotation.kind === 'underline') {
        return <path key={annotation.id} d={`M${x - 85} ${y + 75} Q${x} ${y + 90} ${x + 85} ${y + 75}`}
          fill="none" stroke="#e33e48" strokeWidth="6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />;
      }
      const fromX = Math.min(940, x + 190);
      const fromY = Math.max(55, y - 160);
      return <path key={annotation.id} d={`M${fromX} ${fromY} Q${x + 125} ${y - 110} ${x + 25} ${y - 25}`}
        fill="none" stroke="#e33e48" strokeWidth="5" strokeLinecap="round" markerEnd="url(#school-annotation-arrowhead)" vectorEffect="non-scaling-stroke" />;
    })}
    {draft.length > 0 && drawLine(draft, 'draft')}
  </svg>;
}
