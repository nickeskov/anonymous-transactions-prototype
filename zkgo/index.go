package main

import (
	"fmt"

	"github.com/gopherjs/gopherjs/js"
	"github.com/nickeskov/anonymous-transactions-prototype/zkgo/pkg/crypto/groth16/bn256/utils/bn254"
)

var (
	g1 = bn254.NewG1()
	g2 = bn254.NewG2()
)

func BN254G1Compressed(g1X, g1Y []byte) []byte {
	var uncompressed [64]byte
	copy(uncompressed[:32], g1X)
	copy(uncompressed[32:], g1Y)
	point, err := g1.FromBytes(uncompressed[:])
	if err != nil {
		panic(fmt.Sprintf("BN254G1Compressed: %s", err.Error()))
	}
	return g1.ToCompressed(point)
}

func BN254G2Compressed(g1X, g1Y []byte) []byte {
	var uncompressed [128]byte
	copy(uncompressed[:64], g1X)
	copy(uncompressed[64:], g1Y)
	point, err := g2.FromBytes(uncompressed[:])
	if err != nil {
		panic(fmt.Sprintf("BN254G2Compressed: %s", err.Error()))
	}
	return g2.ToCompressed(point)
}

func main() {
	exports := js.Module.Get("exports")
	exports.Set("bn254G1Compressed", BN254G1Compressed)
	exports.Set("bn254G2Compressed", BN254G2Compressed)
}
