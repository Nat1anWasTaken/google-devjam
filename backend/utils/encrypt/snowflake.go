package encrypt

import (
	"log"
	"github.com/bwmarrin/snowflake"
)

var (
	node *snowflake.Node
	err  error
)

func init() {
	node, err = snowflake.NewNode(1)
	if err != nil {
		log.Fatalf("Failed to create snowflake node: %v", err)
	}
}

func GenerateSnowflakeID() (string, error) {
	// Generate a snowflake ID.
	id := node.Generate()

	return id.String(), nil
}