package socket

import (
	"encoding/json"
	"log"
	"sync"
)

type Hub struct {
	clients    map[string]map[chan []byte]bool
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[string]map[chan []byte]bool),
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

func (h *Hub) BroadcastJSON(orgID string, v interface{}) {
	data, err := json.Marshal(v)
	if err != nil {
		log.Printf("[ws] error marshaling: %v", err)
		return
	}
	h.BroadcastToOrg(orgID, data)
}
