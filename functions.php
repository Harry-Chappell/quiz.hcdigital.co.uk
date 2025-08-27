<?php
header("Content-Type: application/json");

$file = __DIR__ . "/queue.json";
if (!file_exists($file)) file_put_contents($file, json_encode(["queue"=>[], "reset"=>false]));

$data = json_decode(file_get_contents($file), true);

$action = $_GET["action"] ?? null;

if ($action === "register") {
    // Read JSON input
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input || !isset($input['name']) || !isset($input['color'])) {
        echo json_encode(['status'=>'error','msg'=>'Invalid input']);
        exit;
    }

    // Ensure the 'teams' key exists
    if (!isset($data['teams'])) $data['teams'] = [];

    // Prevent duplicate team names
    if (isset($data['teams'][$input['name']])) {
        echo json_encode(['status'=>'error','msg'=>'Team name exists']);
        exit;
    }

    // Add new team
    $data['teams'][$input['name']] = $input['color'];
    file_put_contents($file, json_encode($data));
    echo json_encode(['status'=>'ok']);
    exit;
}

if ($action === "buzz") {
    $input = json_decode(file_get_contents("php://input"), true);
    $now = microtime(true);

    // First buzz time
    if (!isset($data["first"])) $data["first"] = $now;
    $delay = $now - $data["first"];

    $data["queue"][] = [
        "name"=>$input["name"],
        "color"=>$input["color"],
        "delay"=>$delay
    ];
    file_put_contents($file, json_encode($data));
    echo json_encode(["status"=>"buzzed"]);
    exit;
}

if ($action === "queue") {
    echo json_encode($data["queue"] ?? []);
    exit;
}

if ($action === "reset") {
    $data['queue'] = [];
    $data['resetTime'] = microtime(true); // store timestamp
    file_put_contents($file, json_encode($data));
    echo json_encode(["status"=>"reset"]);
    exit;
}

if ($action === "status") {
    // send current resetTime
    echo json_encode([
        'resetTime' => $data['resetTime'] ?? 0
    ]);
    exit;
}

if ($action === "teams") {
    $teams = [];
    if (isset($data['queue'])) {
        foreach ($data['queue'] as $entry) {
            if (!in_array($entry['name'], array_column($teams, 'name'))) {
                $teams[] = ['name'=>$entry['name'], 'color'=>$entry['color']];
            }
        }
    }
    if (isset($data['teams'])) {
        foreach ($data['teams'] as $name=>$color) {
            if (!in_array($name, array_column($teams, 'name'))) {
                $teams[] = ['name'=>$name, 'color'=>$color];
            }
        }
    }
    echo json_encode($teams);
    exit;
}

echo json_encode(["error"=>"unknown action"]);