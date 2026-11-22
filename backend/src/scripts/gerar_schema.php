<?php
/**
 * CLI: lista as tabelas do schema Oracle e gera o arquivo DDL (.sql).
 *
 * Uso (dentro do container / ambiente com OCI8):
 *   php scripts/gerar_schema.php [caminho_saida.sql]
 *
 * Variáveis de ambiente: DB_USER, DB_PASSWORD, DB_SERVICE, DB_SCHEMA (opcional), TNS_ADMIN.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Este script só pode ser executado via linha de comando.');
}

require_once __DIR__ . '/../models/Schema.php';

$saida = $argv[1] ?? __DIR__ . '/../database/schema.sql';

try {
    echo "Conectando ao banco e lendo o schema...\n";
    $tabelas = Schema::descreverTodas();

    echo "Schema (owner): " . Schema::owner() . "\n";
    echo "Tabelas encontradas: " . count($tabelas) . "\n\n";

    foreach ($tabelas as $t) {
        printf("  %-30s %3d colunas | PK: %-20s | FKs: %d\n",
            $t['tabela'],
            count($t['colunas']),
            $t['chave_primaria'] ? implode(',', $t['chave_primaria']['colunas']) : '-',
            count($t['chaves_estrangeiras'])
        );
    }

    $ddl = Schema::gerarDDL($tabelas);

    $dir = dirname($saida);
    if (!is_dir($dir) && !mkdir($dir, 0775, true)) {
        throw new Exception("Não foi possível criar o diretório $dir");
    }
    if (file_put_contents($saida, $ddl) === false) {
        throw new Exception("Não foi possível gravar $saida");
    }

    echo "\nDDL gerado com sucesso: " . realpath($saida) . " (" . strlen($ddl) . " bytes)\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "ERRO: " . $e->getMessage() . "\n");
    exit(1);
}
