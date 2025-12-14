-- Seed data for Ad Effectiveness Analyzer

-- Default settings
INSERT INTO settings (key, value, encrypted) VALUES
    ('hume_api_key', '', true),
    ('frame_sample_rate', '2', false),
    ('worker_processes', '4', false),
    ('max_file_size_mb', '500', false),
    ('yolo_confidence_threshold', '0.25', false),
    ('yolo_model_size', 'yolov5m', false)
ON CONFLICT (key) DO NOTHING;
