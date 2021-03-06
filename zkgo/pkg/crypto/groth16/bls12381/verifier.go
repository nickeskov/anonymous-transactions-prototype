package bls12381

import (
	"errors"
	"math/big"

	bls "github.com/kilic/bls12-381"
)

func ProofVerify(vk *VerificationKey, proof *Proof, inputs []*big.Int) (bool, error) {
	if len(inputs)+1 != len(vk.Ic) {
		return false, errors.New("len(inputs)+1 != len(vk.IC)")
	}
	vkX := vk.Ic[0]
	PointG1 := bls.NewG1()
	for i := 0; i < len(inputs); i++ {
		vkX = PointG1.Add(PointG1.Zero(), vkX, PointG1.MulScalar(PointG1.Zero(), vk.Ic[i+1], inputs[i]))
	}
	// g1 = { -A(G1), alpha(G1), inputs(G1), C(G1) }
	g1 := []*bls.PointG1{PointG1.Neg(PointG1.Zero(), proof.A), vk.AlphaG1, vkX, proof.C}
	// g2 = { B(G2), beta(G2), gamma(G2), delta(G2) }
	g2 := []*bls.PointG2{proof.B, vk.BetaG2, vk.GammaG2, vk.DeltaG2}

	pair := bls.NewEngine()
	for i := 0; i < len(g1); i++ {
		pair.AddPair(g1[i], g2[i])
	}
	// (-A) * B + alpha * beta + inputs * gamma + C * delta == 1
	return pair.Result().IsOne(), nil
}
