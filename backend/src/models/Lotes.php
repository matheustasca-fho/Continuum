<?php

require_once __DIR__ . '/../config/Database.php';

class Lotes {
    public static function criar(
        $cdLote, $statusLote, $descricaoItens, $pesoLote
    ){
        $conn = Database::getConnection();

        $sql = "INSERT INTO LOTES 
            (CD_LOTE, STATUS_LOTE, DS_ITENS, PESO_LOTE)
        VALUES 
            (:cdLote, :statusLote, :descricaoItens, :pesoLote)";
        
        $stmt = oci_parse($conn, $sql);

        oci_bind_by_name($stmt, ':cdLote', $cdLote);
        oci_bind_by_name($stmt, ':statusLote', $statusLote);
        oci_bind_by_name($stmt, ':descricaoItens', $descricaoItens);
        oci_bind_by_name($stmt, ':pesoLote', $pesoLote);

        $executed = @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);

        if (!$executed) {
            $error = oci_error($stmt);
            oci_free_statement($stmt);
            throw new Exception($error['message'] ?? 'Erro ao inserir no banco');
        }

        oci_free_statement($stmt);
        return true;
    }

    public static function listarTodos() {
    $conn = Database::getConnection();

    $sql = "SELECT CD_LOTE, STATUS_LOTE, DS_ITENS, PESO_LOTE FROM LOTES";
    $stmt = oci_parse($conn, $sql);
    oci_execute($stmt);

    $lotes = [];
    
    while ($linha = oci_fetch_assoc($stmt)) {
        $lotes[] = $linha;
    }

    oci_free_statement($stmt);
    return $lotes;
}
}