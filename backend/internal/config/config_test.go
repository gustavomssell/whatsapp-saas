package config

import (
	"os"
	"testing"
)

func TestLoad_DefaultValues(t *testing.T) {
	cfg := Load()

	if cfg.Port != "8080" {
		t.Errorf("expected default port 8080, got %s", cfg.Port)
	}
	if cfg.Env != "development" {
		t.Errorf("expected default env development, got %s", cfg.Env)
	}
	if cfg.UploadMaxSizeMB != 32 {
		t.Errorf("expected default upload max size 32, got %d", cfg.UploadMaxSizeMB)
	}
}

func TestLoad_EnvOverrides(t *testing.T) {
	tests := []struct {
		key      string
		value    string
		field    string
		expected string
	}{
		{"PORT", "9090", "Port", "9090"},
		{"ENV", "production", "Env", "production"},
		{"JWT_SECRET", "my-secret", "JWTSecret", "my-secret"},
		{"DATABASE_URL", "postgres://test@localhost/db", "DatabaseURL", "postgres://test@localhost/db"},
		{"EVOLUTION_API_URL", "http://evolution:8080", "EvolutionAPIURL", "http://evolution:8080"},
		{"EVOLUTION_API_KEY", "key123", "EvolutionAPIKey", "key123"},
		{"UPLOAD_DIR", "/data/uploads", "UploadDir", "/data/uploads"},
		{"UPLOAD_PUBLIC_URL", "https://cdn.example.com/uploads", "UploadPublicURL", "https://cdn.example.com/uploads"},
	}

	for _, tt := range tests {
		t.Run(tt.key, func(t *testing.T) {
			os.Setenv(tt.key, tt.value)
			defer os.Unsetenv(tt.key)

			cfg := Load()

			switch tt.field {
			case "Port":
				if cfg.Port != tt.expected {
					t.Errorf("expected %s, got %s", tt.expected, cfg.Port)
				}
			case "Env":
				if cfg.Env != tt.expected {
					t.Errorf("expected %s, got %s", tt.expected, cfg.Env)
				}
			case "JWTSecret":
				if cfg.JWTSecret != tt.expected {
					t.Errorf("expected %s, got %s", tt.expected, cfg.JWTSecret)
				}
			case "DatabaseURL":
				if cfg.DatabaseURL != tt.expected {
					t.Errorf("expected %s, got %s", tt.expected, cfg.DatabaseURL)
				}
			case "EvolutionAPIURL":
				if cfg.EvolutionAPIURL != tt.expected {
					t.Errorf("expected %s, got %s", tt.expected, cfg.EvolutionAPIURL)
				}
			case "EvolutionAPIKey":
				if cfg.EvolutionAPIKey != tt.expected {
					t.Errorf("expected %s, got %s", tt.expected, cfg.EvolutionAPIKey)
				}
			case "UploadDir":
				if cfg.UploadDir != tt.expected {
					t.Errorf("expected %s, got %s", tt.expected, cfg.UploadDir)
				}
			case "UploadPublicURL":
				if cfg.UploadPublicURL != tt.expected {
					t.Errorf("expected %s, got %s", tt.expected, cfg.UploadPublicURL)
				}
			}
		})
	}
}
