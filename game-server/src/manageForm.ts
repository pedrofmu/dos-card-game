export function manageForm(formBody: FormData) {
  const name = formBody.get("name");
  const email = formBody.get("email");
  const message = formBody.get("message");

  console.log("datos: ", { name, email, message });
}
