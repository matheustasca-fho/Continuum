FROM php:8.2-apache

# 1. Instala utilitários essenciais
RUN apt-get update && apt-get install -y \
    unzip \
    wget \
    ca-certificates \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 2. Instala a biblioteca assíncrona e garante o link para libaio.so.1
RUN apt-get update && apt-get install -y libaio1t64 \
    && ln -s /usr/lib/x86_64-linux-gnu/libaio.so.1t64 /usr/lib/x86_64-linux-gnu/libaio.so.1 \
    && rm -rf /var/lib/apt/lists/*

# Cria diretório para o Oracle Instant Client
RUN mkdir -p /opt/oracle
WORKDIR /opt/oracle

# Baixa o Oracle Instant Client 21 (versão estável sem expiração de link)
RUN wget --no-check-certificate https://download.oracle.com/otn_software/linux/instantclient/2113000/instantclient-basic-linux.x64-21.13.0.0.0dbru.zip \
    && wget --no-check-certificate https://download.oracle.com/otn_software/linux/instantclient/2113000/instantclient-sdk-linux.x64-21.13.0.0.0dbru.zip \
    && unzip instantclient-basic-linux.x64-21.13.0.0.0dbru.zip \
    && unzip instantclient-sdk-linux.x64-21.13.0.0.0dbru.zip \
    && rm -f instantclient-*-linux.x64-*.zip

# Configura as bibliotecas no sistema
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_21_13:$LD_LIBRARY_PATH
RUN echo /opt/oracle/instantclient_21_13 > /etc/ld.so.conf.d/oracle-instantclient.conf \
    && ldconfig

# Configura e instala a extensão OCI8 no PHP
RUN echo 'instantclient,/opt/oracle/instantclient_21_13' | pecl install oci8 \
    && docker-php-ext-enable oci8

# Aponta o DocumentRoot do Apache para a pasta public
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Habilita o mod_rewrite do Apache
RUN a2enmod rewrite

# Variável de ambiente com o caminho do Wallet
ENV TNS_ADMIN=/var/www/wallet

# Permite que o Apache acesse o diretório e processe arquivos .htaccess
RUN echo '<Directory /var/www/html/public>\n\
    Options Indexes FollowSymLinks\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' > /etc/apache2/conf-available/api-directory.conf \
    && a2enconf api-directory

WORKDIR /var/www/html