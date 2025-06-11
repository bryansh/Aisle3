// Compatibility layer for edra components
import CompatButton from './button.svelte';

export const Button = CompatButton;

export function buttonVariants(config = {}) {
  return (config && typeof config === 'object' && 'class' in config && config.class) || '';
}