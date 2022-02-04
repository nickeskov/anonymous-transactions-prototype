package bn256

import (
	"bytes"
	"io"

	bn2542 "github.com/nickeskov/anonymous-transactions-prototype/zkgo/pkg/crypto/groth16/bn256/utils/bn254"
)

type VerificationKey struct {
	AlphaG1 *bn2542.PointG1
	BetaG2  *bn2542.PointG2
	GammaG2 *bn2542.PointG2
	DeltaG2 *bn2542.PointG2
	Ic      []*bn2542.PointG1
}

func GetVerificationKeyFromCompressed(vk []byte) (*VerificationKey, error) {
	reader := bytes.NewReader(vk)

	var g1Repr = make([]byte, 32)
	var g2Repr = make([]byte, 64)

	// Alpha G1
	_, err := reader.Read(g1Repr)
	if err != nil {
		return nil, err
	}
	alphaG1, err := bn2542.NewG1().FromCompressed(g1Repr)
	if err != nil {
		return nil, err
	}

	// Beta G2
	_, err = reader.Read(g2Repr)
	if err != nil {
		return nil, err
	}
	betaG2, err := bn2542.NewG2().FromCompressed(g2Repr)
	if err != nil {
		return nil, err
	}

	// Gamma G2
	_, err = reader.Read(g2Repr)
	if err != nil {
		return nil, err
	}
	gammaG2, err := bn2542.NewG2().FromCompressed(g2Repr)
	if err != nil {
		return nil, err
	}

	// Delta G2
	_, err = reader.Read(g2Repr)
	if err != nil {
		return nil, err
	}
	deltaG2, err := bn2542.NewG2().FromCompressed(g2Repr)
	if err != nil {
		return nil, err
	}

	// IC []G1
	var ic []*bn2542.PointG1
	for {
		_, err := reader.Read(g1Repr)
		if err == io.EOF {
			break
		} else if err != nil && err != io.EOF {
			return nil, err
		}

		g1, err := bn2542.NewG1().FromCompressed(g1Repr)
		if err != nil {
			return nil, err
		}
		ic = append(ic, g1)
	}

	return &VerificationKey{
		AlphaG1: alphaG1,
		BetaG2:  betaG2,
		GammaG2: gammaG2,
		DeltaG2: deltaG2,
		Ic:      ic,
	}, nil

}

func (v *VerificationKey) ToCompressed() []byte {
	var (
		g1  = bn2542.NewG1()
		g2  = bn2542.NewG2()
		out = make([]byte, 0, 32+3*64+32*len(v.Ic))
	)
	out = append(out, g1.ToCompressed(v.AlphaG1)...)
	out = append(out, g2.ToCompressed(v.BetaG2)...)
	out = append(out, g2.ToCompressed(v.GammaG2)...)
	out = append(out, g2.ToCompressed(v.DeltaG2)...)
	for _, p := range v.Ic {
		out = append(out, g1.ToCompressed(p)...)
	}
	return out
}
