package service

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type UploadService struct {
	uploadDir string
	maxSize   int64
	publicURL string
}

func NewUploadService(uploadDir, publicURL string, maxSizeMB int) *UploadService {
	os.MkdirAll(uploadDir, 0755)
	return &UploadService{
		uploadDir: uploadDir,
		maxSize:   int64(maxSizeMB) * 1024 * 1024,
		publicURL: strings.TrimSuffix(publicURL, "/"),
	}
}

func (s *UploadService) GetMaxSize() int {
	return int(s.maxSize)
}

func (s *UploadService) SaveFile(file multipart.File, header *multipart.FileHeader) (string, error) {
	if header.Size > s.maxSize {
		return "", fmt.Errorf("arquivo excede o limite de %d bytes", s.maxSize)
	}

	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = ".bin"
	}

	uuid := make([]byte, 16)
	rand.Read(uuid)
	filename := hex.EncodeToString(uuid) + ext
	finalPath := filepath.Join(s.uploadDir, filename)

	dst, err := os.Create(finalPath)
	if err != nil {
		return "", fmt.Errorf("erro ao criar arquivo: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		os.Remove(finalPath)
		return "", fmt.Errorf("erro ao escrever arquivo: %w", err)
	}

	if s.publicURL != "" {
		return fmt.Sprintf("%s/%s", s.publicURL, filename), nil
	}
	return fmt.Sprintf("/uploads/%s", filename), nil
}

func (s *UploadService) DeleteFile(url string) error {
	filename := filepath.Base(url)
	if filename == "." || filename == "/" || filename == ".." {
		return fmt.Errorf("caminho inválido")
	}
	return os.Remove(filepath.Join(s.uploadDir, filename))
}

func detectMediaType(header *multipart.FileHeader) string {
	buf := make([]byte, 512)
	file, err := header.Open()
	if err != nil {
		return "application/octet-stream"
	}
	defer file.Close()
	file.Read(buf)

	mimeType := http.DetectContentType(buf)
	return mimeType
}
