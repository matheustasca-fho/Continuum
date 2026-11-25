<?php
/**
 * Job diário de expiração de reservas vencidas (BE-10 / AN-05)
 * Pode ser executado via CLI: php src/scripts/expirar_reservas.php
 */

require_once __DIR__ . '/../models/Lotes.php';

$resultado = Lotes::executarJobExpiracaoReservas();
if (PHP_SAPI === 'cli') {
    echo json_encode($resultado, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;
}
