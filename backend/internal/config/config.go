package config

import "os"

type Config struct {
	Port              string
	DatabaseURL       string
	JWTSecret         string
	Env               string
	UploadDir         string
	UploadMaxSizeMB   int
	UploadPublicURL   string
	EvolutionAPIURL   string
	EvolutionAPIKey   string
}

func Load() *Config {
	return &Config{
		Port:            getEnv("PORT", "8080"),
		DatabaseURL:     getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5435/wpsaas?sslmode=disable"),
		JWTSecret:       getEnv("JWT_SECRET", "wpsaas-secret"),
		Env:             getEnv("ENV", "development"),
		UploadDir:       getEnv("UPLOAD_DIR", "./uploads"),
		UploadMaxSizeMB: 32,
		UploadPublicURL: getEnv("UPLOAD_PUBLIC_URL", ""),
		EvolutionAPIURL: getEnv("EVOLUTION_API_URL", "http://localhost:8082"),
		EvolutionAPIKey: getEnv("EVOLUTION_API_KEY", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
