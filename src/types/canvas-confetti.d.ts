declare module "canvas-confetti" {
  interface Options {
    particleCount?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: { x?: number; y?: number };
    angle?: number;
    colors?: string[];
    shapes?: ("square" | "circle")[];
    scalar?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
  }

  type CreateTypes = (options?: Options) => Promise<null>;
  export = CreateTypes;
}
