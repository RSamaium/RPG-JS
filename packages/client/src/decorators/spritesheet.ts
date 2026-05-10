export function Spritesheet(options: Record<string, any> = {}) {
  return (target: any) => {
    Object.assign(target, options);
    if (target.prototype) {
      Object.assign(target.prototype, options);
    }
  };
}
