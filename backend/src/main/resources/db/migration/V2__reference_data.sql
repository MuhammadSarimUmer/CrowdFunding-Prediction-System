-- Reference data. IDs are assigned in insertion order (1..7) but nothing depends on that:
-- the frontend fetches categories and demo data looks them up by name.
INSERT INTO categories (name) VALUES
    ('Technology'),
    ('Design'),
    ('Environment'),
    ('Health'),
    ('Food'),
    ('Education'),
    ('Games');
