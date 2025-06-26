export const settlement = `CREATE TABLE IF NOT EXISTS settlement (
    id INT NOT NULL AUTO_INCREMENT,
    user_id VARCHAR(255) NOT NULL,
    round_id VARCHAR(255) NOT NULL,
    operator_id VARCHAR(255) NOT NULL,
    bet_on int NOT NULL,
    bet_amount DECIMAL(10, 2) NOT NULL,
    winning_amount DECIMAL(10, 2) DEFAULT 0.00,
    multiplier DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status enum('win','loss') Default 'loss',
    result int NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
)`;
