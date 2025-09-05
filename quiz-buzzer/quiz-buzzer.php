<?php
/*
Plugin Name: Quiz Buzzer
Description: Quiz buzzer app packaged as a WordPress plugin. Provides REST endpoints, shortcodes and an admin settings page.
Version: 0.1
Author: Converted
*/

if (!defined('ABSPATH')) {
    exit;
}

class Quiz_Buzzer_Plugin {
    private $option_name = 'quiz_buzzer_settings';
    private $queue_file;

    public function __construct() {
        add_action('admin_menu', [$this, 'admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
    add_action('rest_api_init', [$this, 'register_rest_routes']);
    // ajax endpoints for settings
    add_action('wp_ajax_quiz_buzzer_update_config', [$this, 'ajax_update_config']);
    add_action('wp_ajax_quiz_buzzer_get_config', [$this, 'ajax_get_config']);
    add_shortcode('quiz_buzzer', [$this, 'shortcode_buzzer']);
    add_shortcode('quiz_display', [$this, 'shortcode_display']);
    // admin UI can be rendered as shortcode on a page
    add_shortcode('quiz_admin', [$this, 'shortcode_admin']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_assets']);
        register_activation_hook(__FILE__, [$this, 'on_activate']);

        $upload = wp_upload_dir();
        $this->queue_file = trailingslashit($upload['basedir']) . 'quiz-queue.json';
    }

    public function on_activate() {
        if (!file_exists($this->queue_file)) {
            $data = [
                'teams' => [],
                'queue' => [],
                'firstBuzzTime' => null,
                'resetTime' => microtime(true)
            ];
            // initialize both option and file fallback
            update_option('quiz_buzzer_state', $data);
            wp_mkdir_p(dirname($this->queue_file));
            @file_put_contents($this->queue_file, wp_json_encode($data));
        }
    }

    public function admin_menu() {
    // Register settings page under Settings -> Quiz Buzzer (remove top-level admin UI)
    add_options_page('Quiz Buzzer', 'Quiz Buzzer', 'manage_options', 'quiz-buzzer', [$this, 'settings_page']);
    }

    public function register_settings() {
        register_setting($this->option_name, $this->option_name, [$this, 'validate_settings']);
        add_settings_section('qb_main', 'Main settings', '__return_null', $this->option_name);
        add_settings_field('display_url', 'Display page URL', [$this, 'field_display_url'], $this->option_name, 'qb_main');
        add_settings_field('admin_url', 'Admin page URL', [$this, 'field_admin_url'], $this->option_name, 'qb_main');
        add_settings_field('rest_base', 'REST base', [$this, 'field_rest_base'], $this->option_name, 'qb_main');
    }

    public function validate_settings($input) {
        return $input;
    }

    public function field_display_url() {
        $opt = get_option($this->option_name, []);
        $val = isset($opt['display_url']) ? $opt['display_url'] : '';
        echo '<input type="text" name="' . esc_attr($this->option_name) . '[display_url]" value="' . esc_attr($val) . '" class="regular-text">';
    }

    public function field_admin_url() {
        $opt = get_option($this->option_name, []);
        $val = isset($opt['admin_url']) ? $opt['admin_url'] : '';
        echo '<input type="text" name="' . esc_attr($this->option_name) . '[admin_url]" value="' . esc_attr($val) . '" class="regular-text">';
    }

    public function field_rest_base() {
        $opt = get_option($this->option_name, []);
        $val = isset($opt['rest_base']) ? $opt['rest_base'] : 'quiz/v1';
        echo '<input type="text" name="' . esc_attr($this->option_name) . '[rest_base]" value="' . esc_attr($val) . '" class="regular-text">';
        echo '<p class="description">REST namespace/base (default: quiz/v1). Example full URL: ' . esc_html(rest_url($val . '/')) . '</p>';
    }

    public function settings_page() {
        // Simplified settings page: inputs removed. Admin UI is available via shortcode [quiz_admin]
        $opt = get_option($this->option_name, []);
        $rest = isset($opt['rest_base']) ? $opt['rest_base'] : 'quiz/v1';
        // ensure settings script is enqueued and localized
        $plugin_url = plugin_dir_url(__FILE__);
        $plugin_path = plugin_dir_path(__FILE__);
        wp_enqueue_script('quiz-buzzer-settings', $plugin_url . 'settings.js', [], filemtime($plugin_path . 'settings.js'));
        wp_localize_script('quiz-buzzer-settings', 'QuizBuzzerSettings', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('quiz_buzzer_config'),
            'config' => get_option('quiz_buzzer_config', null)
        ]);

        ?>
        <div class="wrap">
            <h1>Quiz Buzzer Settings</h1>
            <h2>Colours</h2>
            <div id="colors-list"></div>
            <p>
                <input type="text" id="new-color-name" placeholder="Color name">
                <input type="color" id="new-color-hex" value="#e53935">
                <button id="add-color" class="button">Add colour</button>
            </p>

            <h2>Sounds</h2>
            <div id="sounds-list"></div>
            <p>
                <input type="text" id="new-sound-name" placeholder="Sound name">
                <input type="url" id="new-sound-url" placeholder="Sound URL (optional)" style="width:40%;">
                <button id="add-sound" class="button">Add sound</button>
            </p>

            <h2>Shortcodes</h2>
            <p>Place the admin UI on any page using the shortcode: <code>[quiz_admin]</code></p>
            <p>Competitor UI: <code>[quiz_buzzer]</code>, Display UI: <code>[quiz_display]</code></p>
            <p>Current REST base: <code><?php echo esc_html($rest); ?></code> (full URL: <?php echo esc_html(rest_url($rest . '/')); ?>)</p>
        </div>
        <?php
    }

    public function ajax_update_config() {
        if (!current_user_can('manage_options')) wp_send_json_error('permission');
        check_ajax_referer('quiz_buzzer_config', 'nonce');
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        if (!$data) wp_send_json_error('invalid');
        update_option('quiz_buzzer_config', $data);
        wp_send_json_success($data);
    }

    public function ajax_get_config() {
        if (!current_user_can('manage_options')) wp_send_json_error('permission');
        $config = get_option('quiz_buzzer_config', []);
        wp_send_json_success($config);
    }

    // Shortcode that renders the admin UI on a front-end page (visible to admins)
    public function shortcode_admin($atts) {
        if (!current_user_can('manage_options')) return '<p>Insufficient permissions.</p>';
        // ensure admin script is available and localized
        $plugin_url = plugin_dir_url(__FILE__);
        $plugin_path = plugin_dir_path(__FILE__);
        if (!wp_script_is('quiz-buzzer-admin', 'registered')) {
            wp_register_script('quiz-buzzer-admin', $plugin_url . 'admin.js', [], filemtime($plugin_path . 'admin.js'), true);
            $opt = get_option($this->option_name, []);
            $rest = isset($opt['rest_base']) ? $opt['rest_base'] : 'quiz/v1';
            wp_localize_script('quiz-buzzer-admin', 'QuizBuzzerConfig', [ 'restBase' => rest_url($rest . '/') ]);
        }
        wp_enqueue_script('quiz-buzzer-admin');
        wp_enqueue_style('quiz-buzzer-style');
        ob_start();
        ?>
        <div id="quiz-buzzer-admin-shortcode">
            <h2>Quiz Buzzer — Admin</h2>
            <p><button id="reset" class="button">Reset Buzzers</button></p>
            <h2>Teams List</h2>
            <div id="team-list"></div>
        </div>
        <?php
        return ob_get_clean();
    }

    public function admin_page() {
        // enqueue admin assets
        $plugin_url = plugin_dir_url(__FILE__);
        $plugin_path = plugin_dir_path(__FILE__);
        // register & enqueue style for admin
        if (!wp_style_is('quiz-buzzer-style', 'registered')) {
            wp_register_style('quiz-buzzer-style', $plugin_url . 'style.css', [], filemtime($plugin_path . 'style.css'));
        }
        wp_enqueue_style('quiz-buzzer-style');
        // admin script (register & enqueue)
        wp_register_script('quiz-buzzer-admin', $plugin_url . 'admin.js', [], filemtime($plugin_path . 'admin.js'), true);

        $opt = get_option($this->option_name, []);
        $base = isset($opt['rest_base']) ? $opt['rest_base'] : 'quiz/v1';
        wp_localize_script('quiz-buzzer-admin', 'QuizBuzzerConfig', [ 'restBase' => rest_url($base . '/') ]);
        wp_enqueue_script('quiz-buzzer-admin');

        // Output admin HTML
        ?>
        <div class="wrap">
            <h1>Quiz Buzzer — Admin</h1>
            <p><button id="reset" class="button button-warning">Reset Buzzers</button></p>
            <h2>Teams</h2>
            <div id="team-list"></div>
        </div>
        <?php
    }

    private function load_state() {
        // prefer WP option storage
        $opt = get_option('quiz_buzzer_state', null);
        if (is_array($opt) && !empty($opt)) {
            return $opt;
        }

        // fallback to file
        if (!file_exists($this->queue_file)) return ['teams'=>[], 'queue'=>[], 'firstBuzzTime'=>null, 'resetTime'=>0];
        $json = @file_get_contents($this->queue_file);
        $data = $json ? json_decode($json, true) : null;
        if ($data === null) return ['teams'=>[], 'queue'=>[], 'firstBuzzTime'=>null, 'resetTime'=>0];
        if (isset($data['teams']) && is_object($data['teams'])) $data['teams'] = (array) $data['teams'];
        return $data;
    }

    private function save_state($data) {
        if (!isset($data['teams'])) $data['teams'] = [];
        // primary: save to WP option
        update_option('quiz_buzzer_state', $data);
        // also attempt to write file fallback
        @file_put_contents($this->queue_file, wp_json_encode($data));
    }

    public function register_rest_routes() {
        $opt = get_option($this->option_name, []);
        $base = isset($opt['rest_base']) ? $opt['rest_base'] : 'quiz/v1';

        register_rest_route($base, '/(?P<action>[a-zA-Z0-9_]+)', [
            'methods' => WP_REST_Server::ALLMETHODS,
            'callback' => [$this, 'rest_handler'],
            'permission_callback' => '__return_true'
        ]);
    }

    public function rest_handler($req) {
        $action = $req->get_param('action');
        $data = $this->load_state();

        if ($action === 'register') {
            $input = json_decode($req->get_body(), true) ?? [];
            if (empty($input['name']) || empty($input['color']) || !isset($input['sound'])) {
                return rest_ensure_response(['status'=>'error','msg'=>'Invalid input']);
            }
            $name = trim($input['name']);
            $color = strtolower(trim($input['color']));
            // normalize sound: accept string or array/object
            if (is_array($input['sound']) || is_object($input['sound'])) {
                $sound = $input['sound'];
            } else {
                $sound = trim(strval($input['sound']));
            }
            if ($name === '' || $color === '' ) return rest_ensure_response(['status'=>'error','msg'=>'Empty']);
            if (isset($data['teams'][$name])) return rest_ensure_response(['status'=>'error','msg'=>'Team name exists']);
            foreach ($data['teams'] as $n=>$i) if (strtolower($i['color']) === $color) return rest_ensure_response(['status'=>'error','msg'=>'Colour taken']);
            // store sound as provided (string or object)
            $data['teams'][$name] = ['color'=>$color,'sound'=>$sound,'score'=>0];
            $this->save_state($data);
            return rest_ensure_response(['status'=>'ok']);
        }

        if ($action === 'buzz') {
            $input = json_decode($req->get_body(), true) ?? [];
            if (empty($input['name']) || empty($input['color'])) return rest_ensure_response(['status'=>'error','msg'=>'Invalid input']);
            $teamName = $input['name'];
            $teamColor = $input['color'];

            // if team already in queue, return previous entry
            if (!empty($data['queue'])) {
                foreach ($data['queue'] as $entry) {
                    if ($entry['name'] === $teamName) {
                        $isFirst = ($entry['delay'] == 0);
                        return rest_ensure_response([
                            'status'=>'buzzed','first'=>$isFirst,'delay_s'=>round($entry['delay'],3),'delay_ms'=>(int)round($entry['delay']*1000)
                        ]);
                    }
                }
            }

            $now = microtime(true);
            if ($data['firstBuzzTime'] === null) {
                $data['firstBuzzTime'] = $now;
                $delay = 0.0;
            } else {
                $delay = $now - $data['firstBuzzTime'];
            }

            $data['queue'][] = ['name'=>$teamName,'color'=>$teamColor,'time'=>$now,'delay'=>$delay];
            $this->save_state($data);
            return rest_ensure_response(['status'=>'buzzed','first'=>($delay==0.0),'delay_s'=>round($delay,3),'delay_ms'=>(int)round($delay*1000)]);
        }

        if ($action === 'reset') {
            $data['queue'] = [];
            $data['firstBuzzTime'] = null;
            $data['resetTime'] = microtime(true);
            $this->save_state($data);
            return rest_ensure_response(['status'=>'reset']);
        }

        if ($action === 'status') {
            $teamsList = [];
            foreach ($data['teams'] as $name=>$info) {
                $teamsList[] = ['name'=>$name,'color'=>$info['color'],'score'=>$info['score']];
            }
            return rest_ensure_response(['resetTime'=>$data['resetTime'] ?? 0,'teams'=>$teamsList]);
        }

        if ($action === 'teams') {
            $teamsList = [];
            foreach ($data['teams'] as $name=>$info) $teamsList[] = ['name'=>$name,'color'=>$info['color'],'score'=>$info['score'],'sound'=>$info['sound'] ?? ''];
            return rest_ensure_response($teamsList);
        }

        if ($action === 'adjustScore') {
            $team = $req->get_param('team') ?? '';
            $delta = intval($req->get_param('delta') ?? 0);
            if ($team && isset($data['teams'][$team])) {
                $data['teams'][$team]['score'] += $delta;
                $this->save_state($data);
            }
            return rest_ensure_response(['status'=>'ok']);
        }

        if ($action === 'deleteTeam') {
            $team = $req->get_param('team') ?? '';
            if ($team && isset($data['teams'][$team])) {
                unset($data['teams'][$team]);
                if (!empty($data['queue'])) {
                    $data['queue'] = array_values(array_filter($data['queue'], function($q) use ($team){ return $q['name'] !== $team; }));
                }
                $this->save_state($data);
            }
            return rest_ensure_response(['status'=>'ok']);
        }

        if ($action === 'queueFull') {
            return rest_ensure_response($data);
        }

        return rest_ensure_response(['error'=>'unknown action']);
    }

    public function shortcode_buzzer($atts) {
        wp_enqueue_script('quiz-buzzer-public');
        wp_enqueue_style('quiz-buzzer-style');

        // minimal markup matching original scripts.js expectations
        ob_start();
        ?>
        <div id="login-screen">
          <h2>Join a team</h2>
          <ul id="team-list"></ul>

          <form id="create-team-form">
            <input id="new-team-name" placeholder="Team name">
            <input id="selected-colour" type="hidden" value="">
            <input id="selected-sound" type="hidden" value="">
            <ul id="colour-list" class="option-list"></ul>
            <ul id="sound-list" class="option-list"></ul>
            <button type="submit">Create team</button>
          </form>
        </div>

        <div id="buzzer-screen" style="display:none;">
          <h2>Buzzer</h2>
          <div id="team-info"></div>
          <button id="buzz-button">BUZZ</button>
          <div id="buzz-feedback"></div>
          <button id="logout-button">Logout</button>
        </div>
        
                <div id="current-standings-root">
                    <h2>Current Standings</h2>
                    <ol id="current-standings"></ol>
                </div>
        <?php
        return ob_get_clean();
    }

    public function shortcode_display($atts) {
        wp_enqueue_script('quiz-buzzer-display');
        wp_enqueue_style('quiz-buzzer-style');
        return '<div id="quiz-display-root"><h2>Live display</h2><div id="queue"></div></div>';
    }

    public function enqueue_assets() {
        $plugin_url = plugin_dir_url(__FILE__);
        $plugin_path = plugin_dir_path(__FILE__);
        wp_register_script('quiz-buzzer-public', $plugin_url . 'public.js', [], filemtime($plugin_path . 'public.js'), true);
        wp_register_script('quiz-buzzer-display', $plugin_url . 'display.js', [], filemtime($plugin_path . 'display.js'), true);
    // register admin script so front-end shortcode can enqueue it
    wp_register_script('quiz-buzzer-admin', $plugin_url . 'admin.js', [], filemtime($plugin_path . 'admin.js'), true);
        wp_register_style('quiz-buzzer-style', $plugin_url . 'style.css', [], filemtime($plugin_path . 'style.css'));

        $opt = get_option($this->option_name, []);
        $base = isset($opt['rest_base']) ? $opt['rest_base'] : 'quiz/v1';
        wp_localize_script('quiz-buzzer-public', 'QuizBuzzerConfig', [
            'restBase' => rest_url($base . '/'),
            'config' => get_option('quiz_buzzer_config', null)
        ]);
        wp_localize_script('quiz-buzzer-display', 'QuizBuzzerConfig', [
            'restBase' => rest_url($base . '/')
        ]);
        wp_localize_script('quiz-buzzer-admin', 'QuizBuzzerConfig', [
            'restBase' => rest_url($base . '/')
        ]);
    }
}

new Quiz_Buzzer_Plugin();
