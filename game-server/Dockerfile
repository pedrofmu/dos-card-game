# Usa la imagen oficial de Deno
FROM denoland/deno:latest

# Establece el directorio de trabajo
WORKDIR /app

# Copia el archivo de configuración y el código de la aplicación al contenedor
COPY . /app

# Asegúrate de que el contenedor pueda usar la red
EXPOSE 8000

# Comando para ejecutar tu aplicación
CMD ["run", "dev"]
