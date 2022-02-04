package bn256

import (
	"bytes"

	bn2542 "github.com/nickeskov/anonymous-transactions-prototype/zkgo/pkg/crypto/groth16/bn256/utils/bn254"
)

type Proof struct {
	A *bn2542.PointG1
	B *bn2542.PointG2
	C *bn2542.PointG1
}

func GetProofFromCompressed(proof []byte) (*Proof, error) {
	reader := bytes.NewReader(proof)

	var g1Repr = make([]byte, 32)
	var g2Repr = make([]byte, 64)

	// A G1
	_, err := reader.Read(g1Repr)
	if err != nil {
		return nil, err
	}
	aG1, err := bn2542.NewG1().FromCompressed(g1Repr)
	if err != nil {
		return nil, err
	}

	// B G2
	_, err = reader.Read(g2Repr)
	if err != nil {
		return nil, err
	}
	bG2, err := bn2542.NewG2().FromCompressed(g2Repr)
	if err != nil {
		return nil, err
	}

	// C G1
	_, err = reader.Read(g1Repr)
	if err != nil {
		return nil, err
	}
	cG1, err := bn2542.NewG1().FromCompressed(g1Repr)
	if err != nil {
		return nil, err
	}

	return &Proof{
		A: aG1,
		B: bG2,
		C: cG1,
	}, nil
}

func (p *Proof) ToCompressed() []byte {
	var (
		g1  = bn2542.NewG1()
		g2  = bn2542.NewG2()
		out = make([]byte, 0, 32+64+32)
	)
	out = append(out, g1.ToCompressed(p.A)...)
	out = append(out, g2.ToCompressed(p.B)...)
	out = append(out, g1.ToCompressed(p.C)...)
	return out
}
