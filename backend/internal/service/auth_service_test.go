package service

import (
	"strings"
	"testing"
)

func newTestAuthService() *AuthService {
	return &AuthService{
		jwtSecret: "test-secret-key",
	}
}

func TestHashPassword(t *testing.T) {
	svc := newTestAuthService()

	hash, err := svc.HashPassword("minha-senha-123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if hash == "" {
		t.Fatal("expected non-empty hash")
	}
	if hash == "minha-senha-123" {
		t.Fatal("hash should not equal plaintext")
	}
	if !strings.HasPrefix(hash, "$2a$") && !strings.HasPrefix(hash, "$2b$") {
		t.Errorf("expected bcrypt hash prefix, got %s", hash[:4])
	}
}

func TestCheckPassword(t *testing.T) {
	svc := newTestAuthService()

	password := "teste-seguro-456"
	hash, err := svc.HashPassword(password)
	if err != nil {
		t.Fatalf("failed to hash password: %v", err)
	}

	tests := []struct {
		name     string
		password string
		hash     string
		want     bool
	}{
		{"correct password", password, hash, true},
		{"wrong password", "senha-errada", hash, false},
		{"empty password", "", hash, false},
		{"case sensitive", "Teste-Seguro-456", hash, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := svc.CheckPassword(tt.password, tt.hash)
			if got != tt.want {
				t.Errorf("CheckPassword(%q, ...) = %v, want %v", tt.password, got, tt.want)
			}
		})
	}
}

func TestGetJWTSecret(t *testing.T) {
	svc := &AuthService{jwtSecret: "my-secret"}
	if got := svc.GetJWTSecret(); got != "my-secret" {
		t.Errorf("GetJWTSecret() = %q, want %q", got, "my-secret")
	}
}

func TestGenerateSlug(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"Minha Organização", "minha-organizacao"},
		{"  Test  Company  ", "test-company"},
		{"Hello World!", "hello-world"},
		{"UPPERCASE", "uppercase"},
		{"áéíóú àèìòù", "aeiou-aeiou"},
		{"  multiple   spaces  ", "multiple-spaces"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := generateSlug(tt.input)
			if got != tt.want {
				t.Errorf("generateSlug(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}
