<?php
header("Content-Type: application/json");

$file = __DIR__ . "/queue.json";
if (!file_exists($file)) file_put_contents($file, json_encode([
    "teams"=>[], 
    "queue"=>[], 
    "firstBuzzTime"=>null, 
    "resetTime"=>0
]));

$data = json_decode(file_get_contents($file), true);

$action = $_GET["action"] ?? null;

// ------------------ Register a team ------------------
if ($action === "register") {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input || !isset($input['name']) || !isset($input['color'])) {
        echo json_encode(['status'=>'error','msg'=>'Invalid input']); exit;
    }
    if (!isset($data['teams'])) $data['teams'] = [];
    if (isset($data['teams'][$input['name']])) {
        echo json_encode(['status'=>'error','msg'=>'Team exists']); exit;
    }

    $data['teams'][$input['name']] = [
        "color" => $input['color'],
        "score" => 0
    ];

    file_put_contents($file, json_encode($data));
    echo json_encode(['status'=>'ok']); exit;
}

// ------------------ Buzz ------------------
if ($action === "buzz") {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input || !isset($input['name']) || !isset($input['color'])) {
        echo json_encode(['status'=>'error']); exit;
    }

    $now = microtime(true);
    if (!isset($data['firstBuzzTime']) || $data['firstBuzzTime'] === null) {
        $data['firstBuzzTime'] = $now;
        $delay = 0;
    } else {
        $delay = $now - $data['firstBuzzTime'];
    }

    $data['queue'][] = [
        "name" => $input["name"],
        "color" => $input["color"],
        "time" => $now,
        "delay" => $delay
    ];

    file_put_contents($file, json_encode($data));
    echo json_encode(["status"=>"buzzed"]); exit;
}

// ------------------ Reset ------------------
if ($action === "reset") {
    $data['queue'] = [];
    $data['firstBuzzTime'] = null;
    $data['resetTime'] = microtime(true);
    file_put_contents($file, json_encode($data));
    echo json_encode(["status"=>"reset"]); exit;
}

// ------------------ Status ------------------
if ($action === "status") {
    echo json_encode(['resetTime'=>$data['resetTime'] ?? 0]); exit;
}

// ------------------ List teams ------------------
if ($action === "teams") {
    $teamsList = [];
    foreach ($data['teams'] as $name => $info) {
        $teamsList[] = [
            "name"=>$name,
            "color"=>$info['color'],
            "score"=>$info['score']
        ];
    }
    echo json_encode($teamsList); exit;
}

// ------------------ Adjust score ------------------
if ($action === "adjustScore") {
    $team = $_GET['team'] ?? null;
    $delta = intval($_GET['delta'] ?? 0);
    if ($team && isset($data['teams'][$team])) {
        $data['teams'][$team]['score'] += $delta;
        file_put_contents($file, json_encode($data));
    }
    echo json_encode(['status'=>'ok']); exit;
}

// ------------------ Delete team ------------------
if ($action === "deleteTeam") {
    $team = $_GET['team'] ?? null;
    if ($team && isset($data['teams'][$team])) {
        unset($data['teams'][$team]);
        // remove from queue too
        $data['queue'] = array_filter($data['queue'], fn($q)=>$q['name']!==$team);
        file_put_contents($file, json_encode($data));
    }
    echo json_encode(['status'=>'ok']); exit;
}

// ------------------ Full queue ------------------
if ($action === "queueFull") {
    echo json_encode($data); exit;
}

echo json_encode(["error"=>"unknown action"]);