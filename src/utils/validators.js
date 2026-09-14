/**
 * Reglas de formato compartidas entre el registro público
 * (auth.controller.js) y la creación/edición de usuarios desde el panel
 * admin (user.controller.js) — antes vivían duplicadas byte a byte en los
 * dos archivos, con el riesgo de que una regla se ajustara en uno y no en
 * el otro sin que nada lo note.
 */

// Regex simple pero suficiente para validar formato de email en el backend
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Username: 3-50 caracteres, letras/números/punto/guion/guion bajo. Nada de
// espacios ni '@' — así nunca se puede confundir con un email al hacer login.
export const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,50}$/;
