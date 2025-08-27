<?php
// Path to JSON file
$json_file = __DIR__ . '/buzzers.json';

// Read JSON
function read_buzzers() {
    global $json_file;
    if (!file_exists($json_file)) {
        file_put_contents($json_file, json_encode([]));
    }
    $data = json_decode(file_get_contents($json_file), true);
    return $data ?: [];
}

// Write JSON
function write_buzzers($data) {
    global $json_file;
    file_put_contents($json_file, json_encode($data, JSON_PRETTY_PRINT));
}

// Add a buzz
if (isset($_POST['action']) && $_POST['action'] === 'buzz') {
    $team = $_POST['team'] ?? 'Unknown';
    $buzzers = read_buzzers();

    // Check if already buzzed
    foreach ($buzzers as $b) {
        if ($b['team'] === $team) {
            echo json_encode(['status' => 'duplicate']);
            exit;
        }
    }

    // Add buzz with timestamp
    $buzzers[] = [
        'team' => $team,
        'time' => microtime(true)
    ];
    write_buzzers($buzzers);

    echo json_encode(['status' => 'ok']);
    exit;
}

// Reset queue
if (isset($_POST['action']) && $_POST['action'] === 'reset') {
    write_buzzers([]);
    echo json_encode(['status' => 'reset']);
    exit;
}

// Fetch buzzers
if (isset($_GET['action']) && $_GET['action'] === 'get') {
    echo json_encode(read_buzzers());
    exit;
}
?>