const API_URL = "https://script.google.com/macros/s/AKfycbycRBYARr23G3oH8axqcESyH2NA_2bQnhacKH-YhMjcpyqYV2CA5cnCoxwut_pDvjwt/exec";

const form = document.getElementById("facilitiesForm");
const message = document.getElementById("formMessage");
const submitButton = document.getElementById("submitButton");
const telefoneInput = document.getElementById("telefone");

telefoneInput.addEventListener("input", () => {
  let value = telefoneInput.value.replace(/\D/g, "");
  value = value.slice(0, 11);

  if (value.length > 10) {
    value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  } else if (value.length > 6) {
    value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
  } else if (value.length > 2) {
    value = value.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
  } else if (value.length > 0) {
    value = value.replace(/^(\d{0,2})$/, "($1");
  }

  telefoneInput.value = value;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = new URLSearchParams();
  payload.append("nome", document.getElementById("nome").value.trim());
  payload.append("telefone", document.getElementById("telefone").value.trim());
  payload.append("desafio", document.getElementById("desafio").value);
  payload.append("ferramenta", document.getElementById("ferramenta").value);
  payload.append("meta", document.getElementById("meta").value);

  submitButton.disabled = true;
  submitButton.textContent = "Enviando...";
  message.textContent = "";
  message.className = "form-message";

  try {
    await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      body: payload
    });

    form.reset();
    message.textContent = "Registro enviado! Confira se ele apareceu na planilha.";
    message.classList.add("success");
  } catch (error) {
    message.textContent = "Não foi possível enviar. Verifique a publicação do Apps Script.";
    message.classList.add("error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Enviar registro";
  }
});
