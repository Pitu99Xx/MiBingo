type Fn = (msg: string) => void;
let listener: Fn | null = null;
export function onToast(fn: Fn | null) { listener = fn; }
export function toast(msg: string) { listener?.(msg); }
