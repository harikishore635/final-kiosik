/**
 * intentRouter.js — Intent-to-Action Router
 *
 * Takes the parsed AI response JSON and routes it to the correct
 * action handler. The frontend executes these actions safely —
 * the LLM never directly mutates state.
 */

// Only destructive/irreversible actions need confirmation.
// Navigation, form fill, language switch etc. are safe and execute instantly.
const REQUIRES_CONFIRMATION = new Set([
  'SUBMIT_FORM', 'PAY_BILL', 'DELETE_DATA', 'ADMIN_ACTION',
]);

// Single source of truth lives in navigationRegistry.js. Re-exported here so
// existing importers keep working.
export { INTENT_TO_PATH } from './navigationRegistry.js';

/**
 * Route an AI response to an executable action.
 */
export function routeAction(aiResponse, routerContext) {
  const { action } = aiResponse;
  const ctx = routerContext || {};

  if (!action) return { handled: false, actionType: 'NONE' };

  const { type } = action;

  if (REQUIRES_CONFIRMATION.has(type)) {
    if (ctx.onConfirmRequired) {
      const confirmMessage = aiResponse.response || 'Would you like me to proceed?';
      ctx.onConfirmRequired(action, confirmMessage);
      return { handled: false, actionType: `${type}_PENDING_CONFIRM` };
    }
  }

  switch (type) {

    case 'NAVIGATE_PAGE':
      if (action.path && ctx.navigate) ctx.navigate(action.path);
      return { handled: true, actionType: type };

    case 'START_NAVIGATION':
      if (ctx.onMapAction) {
        ctx.navigate?.('/office-locator');
        ctx.onMapAction({ type: 'START_NAVIGATION', category: action.destinationCategory, destination: action.destination });
      }
      return { handled: true, actionType: type };

    case 'SHOW_NEARBY':
      if (ctx.onNearbySearch) {
        ctx.navigate?.('/office-locator');
        ctx.onNearbySearch(action.category);
      } else if (ctx.navigate) {
        ctx.navigate('/office-locator');
      }
      return { handled: true, actionType: type };

    case 'SEARCH_OFFICES':
      if (ctx.onNearbySearch) ctx.onNearbySearch(action.query || action.category);
      return { handled: true, actionType: type };

    case 'FILL_FORM':
      if (ctx.onFormFill && action.fieldName && action.value !== undefined) {
        ctx.onFormFill(action.fieldName, action.value);
      }
      return { handled: true, actionType: type };

    case 'SUBMIT_FORM':
      if (ctx.onFormSubmit) ctx.onFormSubmit(action.formId);
      return { handled: true, actionType: type };

    case 'SWITCH_LANGUAGE':
      if (ctx.onLanguageSwitch && action.language) ctx.onLanguageSwitch(action.language);
      return { handled: true, actionType: type };

    case 'READ_PAGE':
      if (ctx.onReadPage) ctx.onReadPage();
      return { handled: true, actionType: type };

    case 'SCROLL_PAGE':
      handleScrollPage(action.direction);
      return { handled: true, actionType: type };

    case 'ZOOM_MAP':
      if (ctx.onMapAction) ctx.onMapAction({ type: 'ZOOM', direction: action.direction });
      return { handled: true, actionType: type };

    case 'TRACK_APPLICATION':
      if (ctx.navigate) {
        const q = action.query || action.applicationId || action.ticketId || '';
        ctx.navigate(`/track-status${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      }
      return { handled: true, actionType: type };

    case 'EMERGENCY_ALERT':
      window.dispatchEvent(new CustomEvent('suvidha:open-emergency', {
        detail: { reason: action.reason || 'voice_trigger' },
      }));
      return { handled: true, actionType: type };

    case 'ESCALATE_HUMAN':
      window.dispatchEvent(new CustomEvent('suvidha:escalate', {
        detail: { reason: action.reason || 'user_request' },
      }));
      return { handled: true, actionType: type };

    default:
      console.warn('[IntentRouter] Unknown action type:', type);
      return { handled: false, actionType: type };
  }
}

function handleScrollPage(direction) {
  const scrollMap = {
    down:   () => window.scrollBy({ top: 300, behavior: 'smooth' }),
    up:     () => window.scrollBy({ top: -300, behavior: 'smooth' }),
    top:    () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    bottom: () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }),
  };
  const fn = scrollMap[direction || 'down'];
  if (fn) fn();
}

export function isNavigationIntent(intent) {
  return intent?.startsWith('navigate_') || intent === 'find_location';
}

export function requiresLLM(intent) {
  const localIntents = new Set([
    'navigate_home', 'navigate_electricity', 'navigate_gas',
    'navigate_water', 'navigate_municipal', 'navigate_transport',
    'navigate_healthcare', 'navigate_schemes', 'navigate_complaints',
  ]);
  return !localIntents.has(intent);
}

export default { routeAction, isNavigationIntent, requiresLLM, INTENT_TO_PATH };
