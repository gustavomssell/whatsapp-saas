package service

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"github.com/user/whatsapp-saas/internal/models"
)

type AuthService struct {
	db        *pgxpool.Pool
	jwtSecret string
}

func NewAuthService(db *pgxpool.Pool, jwtSecret string) *AuthService {
	return &AuthService{db: db, jwtSecret: jwtSecret}
}

type AuthResult struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
}

func (s *AuthService) Register(ctx context.Context, name, email, password, orgName string) (*AuthResult, error) {
	var exists bool
	s.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE email=$1)", email).Scan(&exists)
	if exists {
		return nil, fmt.Errorf("email já cadastrado")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	orgSlug := generateSlug(orgName)
	var orgID string
	err = s.db.QueryRow(ctx,
		`INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id`,
		orgName, orgSlug,
	).Scan(&orgID)
	if err != nil {
		return nil, fmt.Errorf("erro ao criar organização: %w", err)
	}

	var user models.User
	err = s.db.QueryRow(ctx,
		`INSERT INTO users (org_id, name, email, password_hash, role)
		 VALUES ($1, $2, $3, $4, 'owner') RETURNING id, org_id, name, email, role, created_at`,
		orgID, name, email, string(hash),
	).Scan(&user.ID, &user.OrgID, &user.Name, &user.Email, &user.Role, &user.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("erro ao criar usuário: %w", err)
	}

	_, _ = s.db.Exec(ctx,
		`INSERT INTO organization_members (org_id, user_id, role) VALUES ($1, $2, 'owner')`,
		orgID, user.ID,
	)

	token, err := s.generateToken(user.ID, user.OrgID, user.Role)
	if err != nil {
		return nil, err
	}

	return &AuthResult{Token: token, User: user}, nil
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*AuthResult, error) {
	var user models.User
	err := s.db.QueryRow(ctx,
		`SELECT id, org_id, name, email, password_hash, role, COALESCE(avatar,''), COALESCE(phone,''), created_at
		 FROM users WHERE email=$1`, email,
	).Scan(&user.ID, &user.OrgID, &user.Name, &user.Email, &user.PasswordHash, &user.Role, &user.Avatar, &user.Phone, &user.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("credenciais inválidas")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, fmt.Errorf("credenciais inválidas")
	}

	token, err := s.generateToken(user.ID, user.OrgID, user.Role)
	if err != nil {
		return nil, err
	}

	return &AuthResult{Token: token, User: user}, nil
}

func (s *AuthService) RefreshToken(ctx context.Context, userID string) (string, error) {
	var user models.User
	err := s.db.QueryRow(ctx,
		`SELECT id, org_id, role FROM users WHERE id=$1`, userID,
	).Scan(&user.ID, &user.OrgID, &user.Role)
	if err != nil {
		return "", fmt.Errorf("usuário não encontrado")
	}
	return s.generateToken(user.ID, user.OrgID, user.Role)
}

func (s *AuthService) generateToken(userID, orgID, role string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"org_id":  orgID,
		"role":    role,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

func (s *AuthService) GetJWTSecret() string {
	return s.jwtSecret
}

func (s *AuthService) CheckPassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

func (s *AuthService) HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func generateSlug(name string) string {
	slug := ""
	for _, c := range name {
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') {
			slug += string(c)
		} else if c >= 'A' && c <= 'Z' {
			slug += string(c + 32)
		} else if c == ' ' || c == '-' {
			slug += "-"
		}
	}
	if slug == "" {
		slug = uuid.New().String()[:8]
	}
	return slug
}
