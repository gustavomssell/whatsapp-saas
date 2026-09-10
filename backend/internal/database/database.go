package database

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(databaseURL string) (*pgxpool.Pool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to parse config: %w", err)
	}

	cfg.MaxConns = 20

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("unable to create pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}

	return pool, nil
}

func RunMigrations(pool *pgxpool.Pool) error {
	entries, err := os.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("failed to read migrations dir: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		content, err := os.ReadFile("migrations/" + entry.Name())
		if err != nil {
			return fmt.Errorf("failed to read migration %s: %w", entry.Name(), err)
		}
		if _, err := pool.Exec(context.Background(), string(content)); err != nil {
			return fmt.Errorf("failed to run migration %s: %w", entry.Name(), err)
		}
	}
	return nil
}
