package socket

import (
	"encoding/json"
	"log"
	"sync"
)

type Hub struct {
	clients    map[string]map[chan []byte]bool
	userClients map[string]map[chan []byte]bool
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:     make(map[string]map[chan []byte]bool),
		userClients: make(map[string]map[chan []byte]bool),
	}
}

func (h *Hub) Register(orgID string, ch chan []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.clients[orgID] == nil {
		h.clients[orgID] = make(map[chan []byte]bool)
	}
	h.clients[orgID][ch] = true
	log.Printf("[ws] client registered for org %s (total: %d)", orgID, len(h.clients[orgID]))
}

func (h *Hub) RegisterUser(userID string, ch chan []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.userClients[userID] == nil {
		h.userClients[userID] = make(map[chan []byte]bool)
	}
	h.userClients[userID][ch] = true
	log.Printf("[ws] client registered for user %s (total: %d)", userID, len(h.userClients[userID]))
}

func (h *Hub) Unregister(orgID string, ch chan []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if clients, ok := h.clients[orgID]; ok {
		delete(clients, ch)
		close(ch)
		if len(clients) == 0 {
			delete(h.clients, orgID)
		}
	}
}

func (h *Hub) UnregisterUser(userID string, ch chan []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if clients, ok := h.userClients[userID]; ok {
		delete(clients, ch)
		if len(clients) == 0 {
			delete(h.userClients, userID)
		}
	}
}

func (h *Hub) BroadcastToOrg(orgID string, data []byte) {
	h.mu.RLock()
	clients := h.clients[orgID]
	h.mu.RUnlock()

	for ch := range clients {
		select {
		case ch <- data:
		default:
			log.Printf("[ws] dropping message for org %s (channel full)", orgID)
		}
	}
}

func (h *Hub) BroadcastToUser(userID string, data []byte) {
	h.mu.RLock()
	clients := h.userClients[userID]
	h.mu.RUnlock()

	for ch := range clients {
		select {
		case ch <- data:
		default:
			log.Printf("[ws] dropping message for user %s (channel full)", userID)
		}
	}
}

func (h *Hub) BroadcastJSON(orgID string, v interface{}) {
	data, err := json.Marshal(v)
	if err != nil {
		log.Printf("[ws] error marshaling: %v", err)
		return
	}
	h.BroadcastToOrg(orgID, data)
}

func (h *Hub) BroadcastJSONToUser(userID string, v interface{}) {
	data, err := json.Marshal(v)
	if err != nil {
		log.Printf("[ws] error marshaling: %v", err)
		return
	}
	h.BroadcastToUser(userID, data)
}
