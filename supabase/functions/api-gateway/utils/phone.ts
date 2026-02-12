/**
 * @fileoverview Phone Utilities (API Gateway)
 * @description Re-exports from shared phone utilities.
 * All logic lives in _shared/phone.ts for consistency across edge functions.
 */

export {
  normalizePhone,
  isValidSpanishMobile,
  isNormalizedFormat,
  toE164,
} from '../../_shared/phone.ts';

/**
 * @deprecated Use normalizePhone() instead. This alias exists for backward compatibility.
 */
export { normalizePhone as normalizeSpanishPhone } from '../../_shared/phone.ts';
