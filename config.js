window.SITE = {
  nome: "NÓRDEN Arquitectura",

  // DATOS FICTICIOS: reemplazar antes de publicar.
  whatsapp: {
    numero: "112233445566", // solo dígitos, con código de país (ej.: 5491122334455)
    mensagem: "Hola, quiero conversar sobre mi proyecto.",
  },

  contato: {
    email: "contacto@nordenarquitectura.com.ar", // ficticio
    // Opcional: clave de Web3Forms (https://web3forms.com). Si está vacía, usa FormSubmit.
    // demo: true → el formulario valida pero NO envía (mail ficticio). Poner false con un mail real.
    demo: true,
    web3formsChave: "",
    assunto: "Nueva consulta desde el sitio NÓRDEN Arquitectura",
  },

  // "casa3d": la casa se construye en 3D con el scroll. "video": el video original.
  abertura: "video",

  // Indicador de etapas sobre el video de obra (desde qué punto del recorrido, 0 a 1)
  etapas: [[0, "Terreno"], [0.08, "Estructura"], [0.27, "Obra gruesa"], [0.52, "Terminaciones"], [0.7, "Casa terminada"], [0.88, "Adentro"]],

  frames: {
    total: 160, // valor que imprime fatiar_frames.sh
    desktop: "assets/frames/desktop/f_{n}.webp",
    mobile: "assets/frames/mobile/f_{n}.webp",
  },
};
