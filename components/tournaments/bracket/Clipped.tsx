import * as React from 'react';

export interface ClippedProps {
  path: React.ReactElement | Array<React.ReactElement>
  children?: React.ReactNode
}

export const Clipped: React.FC<ClippedProps> = ({ path, children }) => {
  const id = React.useId();

  return (
    <g>
      <defs>
        <clipPath id={id}>
          {path}
        </clipPath>
      </defs>

      <g clipPath={`url(#${id})`}>
        {children}
      </g>
    </g>
  );
};

export default Clipped;

export interface RectClippedProps {
  x: number;
  y: number;
  width: number;
  height: number;
  children?: React.ReactNode
}

export const RectClipped: React.FC<RectClippedProps> = ({ x, y, width, height, children }) => {
  return (
    <Clipped path={<rect x={x} y={y} width={width} height={height}/>}>
      {children}
    </Clipped>
  );
};
