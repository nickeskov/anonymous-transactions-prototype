export GO111MODULE=on

SOURCE_DIRS = pkg

.PHONY: vendor vetcheck fmtcheck clean build gotest mod-clean

all: vendor vetcheck fmtcheck build gotest mod-clean

vendor:
	go mod vendor

vetcheck:
	go vet ./...
	golangci-lint run --skip-dirs pkg/crypto/groth16/bn256/utils/bn254

fmtcheck:
	@gofmt -l -s $(SOURCE_DIRS) | grep ".*\.go"; if [ "$$?" = "0" ]; then exit 1; fi


build:
	gopherjs build index.go -o js/index.js

clean:
	@rm -r js

gotest:
	go test -cover -race -covermode=atomic ./...

mod-clean:
	go mod tidy
