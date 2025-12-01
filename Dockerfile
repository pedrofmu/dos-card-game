# Usa una imagen base de Apache
FROM httpd:latest

MAINTAINER PedroFM (contacto@pedrofm.dev)

COPY ./public/ /usr/local/apache2/htdocs
COPY ./.apache/httpd.conf /usr/local/apache2/conf/httpd.conf

# Esta es la carpeta donde guardaremos nuestro VirtualHosts
RUN mkdir -p /usr/local/apache2/conf/sites/
COPY ./.apache/apache-virtual-host.conf /usr/local/apache2/conf/sites/apache-virtual-host.conf

EXPOSE 80

CMD ["httpd", "-D", "FOREGROUND"]
