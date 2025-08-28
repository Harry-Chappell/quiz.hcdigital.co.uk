<?php
header("Content-Type: application/json");

$file = __DIR__ . "/queue.json";
if (!file_exists($file)) {
    file_put_contents($file, json_encode([
        "teams" => [],           // "Team Name" => ["color"=>"#hex","score"=>0]
        "queue" => [],           // [{name,color,time,delay}]
        "firstBuzzTime" => null, // float (seconds, microtime)
        "resetTime" => 0
    ]));
}

$data = json_decode(file_get_contents($file), true);
$action = $_GET["action"] ?? null;

function save_state($file, $data) {
    file_put_contents($file, json_encode($data));
}

/* ---------------- Register a team ---------------- */
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

    save_state($file, $data);
    echo json_encode(['status'=>'ok']); exit;
}

/* ---------------- Buzz ---------------- */
if ($action === "buzz") {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input || !isset($input['name']) || !isset($input['color'])) {
        echo json_encode(['status'=>'error','msg'=>'Invalid input']); exit;
    }

    $teamName = $input['name'];
    $teamColor = $input['color'];

    // If this team has already buzzed this round, return its previous delay/first info
    if (!empty($data['queue'])) {
        foreach ($data['queue'] as $entry) {
            if ($entry['name'] === $teamName) {
                $isFirst = ($entry['delay'] == 0);
                echo json_encode([
                    "status"   => "buzzed",
                    "first"    => $isFirst,
                    "delay_s"  => round($entry['delay'], 3),
                    "delay_ms" => (int)round($entry['delay'] * 1000)
                ]);
                exit;
            }
        }
    }

    $now = microtime(true);
    if ($data['firstBuzzTime'] === null) {
        $data['firstBuzzTime'] = $now;
        $delay = 0.0;
    } else {
        $delay = $now - $data['firstBuzzTime']; // seconds
    }

    $data['queue'][] = [
        "name"  => $teamName,
        "color" => $teamColor,
        "time"  => $now,
        "delay" => $delay
    ];

    save_state($file, $data);

    echo json_encode([
        "status"   => "buzzed",
        "first"    => ($delay == 0.0),
        "delay_s"  => round($delay, 3),
        "delay_ms" => (int)round($delay * 1000)
    ]);
    exit;
}

/* ---------------- Reset ---------------- */
if ($action === "reset") {
    $data['queue'] = [];
    $data['firstBuzzTime'] = null;
    $data['resetTime'] = microtime(true);
    save_state($file, $data);
    echo json_encode(["status"=>"reset"]); exit;
}

/* ---------------- Status (now also returns teams) ---------------- */
if ($action === "status") {
    $teamsList = [];
    if (!empty($data['teams'])) {
        foreach ($data['teams'] as $name => $info) {
            $teamsList[] = [
                "name"  => $name,
                "color" => $info['color'],
                "score" => $info['score']
            ];
        }
    }
    echo json_encode([
        'resetTime' => $data['resetTime'] ?? 0,
        'teams'     => $teamsList
    ]);
    exit;
}

/* ---------------- Teams ---------------- */
if ($action === "teams") {
    $teamsList = [];
    foreach ($data['teams'] as $name => $info) {
        $teamsList[] = ["name"=>$name, "color"=>$info['color'], "score"=>$info['score']];
    }
    echo json_encode($teamsList); exit;
}

/* ---------------- Adjust score ---------------- */
if ($action === "adjustScore") {
    $team = $_GET['team'] ?? null;
    $delta = intval($_GET['delta'] ?? 0);
    if ($team && isset($data['teams'][$team])) {
        $data['teams'][$team]['score'] += $delta;
        save_state($file, $data);
    }
    echo json_encode(['status'=>'ok']); exit;
}

/* ---------------- Delete team ---------------- */
if ($action === "deleteTeam") {
    $team = $_GET['team'] ?? null;
    if ($team && isset($data['teams'][$team])) {
        unset($data['teams'][$team]);
        // Also remove any queued buzzes for that team (this round)
        if (!empty($data['queue'])) {
            $data['queue'] = array_values(array_filter($data['queue'], fn($q) => $q['name'] !== $team));
        }
        save_state($file, $data);
    }
    echo json_encode(['status'=>'ok']); exit;
}

/* ---------------- Full queue (for display) ---------------- */
if ($action === "queueFull") {
    echo json_encode($data); exit;
}

echo json_encode(["error"=>"unknown action"]);