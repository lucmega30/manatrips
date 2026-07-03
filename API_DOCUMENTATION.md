# 🗺️ ManaTrip API - Módulo de Usuarios y Autenticación

Este documento contiene la especificación completa de los endpoints del backend para la gestión de usuarios, autenticación y control de accesos en **ManaTrip**.

* **Base URL:** `http://localhost:3000/api/usuarios`
* **Formato de Intercambio de Datos:** JSON
* **Cabecera Obligatoria para Peticiones:** `Content-Type: application/json`

---

## 🔐 Manejo de Sesión y Seguridad

Todas las rutas clasificadas como **Protegidas** o **Restringidas** requieren obligatoriamente el envío de un Token JWT válido. Este debe incluirse en los HTTP Headers de la siguiente manera:

```text
Authorization: Bearer <TU_TOKEN_JWT>


Si el token no es enviado, está vencido o fue alterado, el servidor responderá automáticamente con un estado 401 Unauthorized.

📌 1. Endpoints Públicos
➡️ Registrar Usuario
Crea una nueva cuenta en la plataforma. Por defecto, si no se especifica un rol, el usuario se registrará como turista.

URL: /registro

Método: POST

Cuerpo de la Petición (JSON):
{
  "nombre": "Elias Guerrero",
  "correo": "elias@manatrip.com",
  "password": "ClaveSegura123",
  "rol": "turista" 
}



Respuesta Exitosa (21 Created):
{
  "mensaje": "¡Usuario registrado con éxito!",
  "usuario": {
    "id": 1,
    "nombre": "Elias Guerrero",
    "correo": "elias@manatrip.com",
    "rol": "turista"
  }
}

Respuestas de Error Frecuentes:

400 Bad Request (Error de Validación): Cuando los datos no cumplen con los requisitos mínimos de formato.

{
  "errores": [
    { "type": "field", "msg": "El nombre es obligatorio.", "path": "nombre", "location": "body" },
    { "type": "field", "msg": "Ingresa un correo válido.", "path": "correo", "location": "body" },
    { "type": "field", "msg": "La contraseña debe tener al menos 6 caracteres.", "path": "password", "location": "body" }
  ]
}

400 Bad Request (Correo Duplicado):
{ "error": "El correo ya está registrado." }



➡️ Inicio de Sesión (Login)
Autentica al usuario y retorna el token de acceso JWT con una validez de 1 hora.

URL: /login

Método: POST

Cuerpo de la Petición (JSON):
{
  "correo": "elias@manatrip.com",
  "password": "ClaveSegura123"
}

Respuesta Exitosa (200 OK):
{
  "mensaje": "¡Inicio de sesión exitoso!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibm9tYnJlIjoiRWxpYXMiLCJyb2wiOiJ0dXJpc3RhIiwiaWF0IjoxNzE5NTYwMDB9...",
  "usuario": {
    "id": 1,
    "nombre": "Elias Guerrero",
    "correo": "elias@manatrip.com",
    "rol": "turista"
  }
}

Respuesta de Error Frecuente (400 Bad Request):
{ "error": "Credenciales incorrectas." }



🛡️ 2. Endpoints Protegidos (Requieren Token)
➡️ Obtener Perfil del Usuario
Permite al usuario autenticado consultar la información vigente de su propia cuenta.

URL: /perfil

Método: GET

Headers: Authorization: Bearer <TOKEN>

Respuesta Exitosa (200 OK):

{
  "mensaje": "¡Token válido!",
  "perfil": {
    "id": 1,
    "nombre": "Elias Guerrero",
    "correo": "elias@manatrip.com",
    "rol": "turista"
  }
}

➡️ Actualizar Datos del Perfil
Permite modificar el nombre y/o el correo electrónico del usuario en sesión. Ambos campos son opcionales en el JSON, pero si se envían deben ser válidos.

URL: /perfil/actualizar

Método: PUT

Headers: Authorization: Bearer <TOKEN>

Cuerpo de la Petición (JSON): (Puedes mandar solo uno de los dos si lo deseas)
{
  "nombre": "Elias Modificado",
  "correo": "nuevo_correo@manatrip.com"
}


Respuesta Exitosa (200 OK):
{
  "mensaje": "¡Perfil actualizado con éxito!",
  "usuario": {
    "id": 1,
    "nombre": "Elias Modificado",
    "correo": "nuevo_correo@manatrip.com",
    "rol": "turista"
  }
}


Respuestas de Error Frecuentes:

400 Bad Request (Correo Ocupado):

{ "error": "El correo ya está en uso por otro usuario." }


➡️ Cambiar Contraseña
Permite actualizar la clave de acceso validando de forma segura que el usuario conozca su contraseña actual.

URL: /perfil/cambiar-password

Método: PUT

Headers: Authorization: Bearer <TOKEN>

Cuerpo de la Petición (JSON):
{
  "passwordActual": "ClaveSegura123",
  "passwordNueva": "NuevaClave456"
}


Respuesta Exitosa (200 OK):
{
  "mensaje": "¡Contraseña actualizada con éxito! Por seguridad, deberás iniciar sesión nuevamente."
}

Respuesta de Error Frecuente (400 Bad Request):
{ "error": "La contraseña actual es incorrecta." }


🚫 3. Endpoints Restringidos (Solo Rol: 'admin')
➡️ Panel de Control de Administrador
Ruta de control restringida para probar la efectividad del sistema RBAC (Control de Accesos por Roles).

URL: /admin/panel

Método: GET

Headers: Authorization: Bearer <TOKEN_DE_UN_ADMIN>

Respuesta Exitosa (200 OK):

{
  "mensaje": "¡Bienvenido, Administrador! Tienes acceso al panel de control de ManaTrip."
}


Respuesta de Error por Permisos Insuficientes (403 Forbidden):

{
  "error": "Acceso prohibido. Esta acción es exclusiva para roles: [admin]"
}







