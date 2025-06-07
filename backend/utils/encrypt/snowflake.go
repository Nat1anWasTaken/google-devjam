package encrypt

import (
	"log"
	"time"

	"github.com/bwmarrin/snowflake"
)

var (
	node *snowflake.Node
	err  error
)

func init() {
	node, err = snowflake.NewNode(1)
	snowflake.Epoch = time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC).Unix()
	if err != nil {
		log.Fatalf("Failed to create snowflake node: %v", err)
	}
}

func GenerateSnowflakeID() (string, error) {
	// Generate a snowflake ID.
	id := node.Generate()

	return id.String(), nil
}