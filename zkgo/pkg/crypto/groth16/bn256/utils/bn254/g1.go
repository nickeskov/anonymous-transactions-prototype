package bn254

import (
	"errors"
	"math"
	"math/big"
)

// PointG1 is type for point in G1.
// PointG1 is both used for Affine and Jacobian point representation.
// If z is equal to one the point is accounted as in affine form.
type PointG1 [3]fe

func (p *PointG1) Set(p2 *PointG1) *PointG1 {
	p[0].set(&p2[0])
	p[1].set(&p2[1])
	p[2].set(&p2[2])
	return p
}

func (p *PointG1) Zero() *PointG1 {
	p[0].zero()
	p[1].one()
	p[2].zero()
	return p
}

type tempG1 struct {
	t [9]*fe
}

// G1 is struct for G1 group.
type G1 struct {
	tempG1
}

func (g *G1) FromCompressed(compressed []byte) (*PointG1, error) {
	if len(compressed) != 32 {
		return nil, errors.New("input string should be equal or larger than 32")
	}
	var in [32]byte
	//
	copy(in[:], compressed[:])
	//
	//if in[0]&(1<<7) == 0 {
	//	return nil, errors.New("compression flag should be set")
	//}
	if in[0]&(1<<6) != 0 {
		// in[0] == (1 << 6) + (1 << 7)
		for i, v := range in {
			//ATTENTION
			if (i == 0 && v != 0xc0) || (i != 0 && v != 0x00) {
				return nil, errors.New("input string should be zero when infinity flag is set")
			}
		}
		return g.Zero(), nil
	}
	a := in[0]&(1<<7) != 0
	//
	in[0] &= 0x3f
	//
	x, err := fromBytes(in[:])
	if err != nil {
		return nil, err
	}
	// solve curve equation
	y := &fe{}
	square(y, x)
	mul(y, y, x)
	add(y, y, b)
	if ok := sqrt(y, y); !ok {
		return nil, errors.New("point is not on curve")
	}
	if y.signBE() == a {
		neg(y, y)
	}
	z := new(fe).one()
	p := &PointG1{*x, *y, *z}
	//if !g.InCorrectSubgroup(p) {
	//	return nil, errors.New("point is not on correct subgroup")
	//}
	return p, nil
}

// ToCompressed given a G1 point returns bytes in compressed form of the point.
func (g *G1) ToCompressed(p *PointG1) []byte {
	out := make([]byte, 32)
	g.Affine(p)
	if g.IsZero(p) {
		out[0] |= 1 << 6
		out[0] |= 1 << 7
	} else {
		copy(out[:], toBytes(&p[0]))
		if !p[1].signBE() {
			out[0] |= 1 << 7
		}
	}
	return out
}

// NewG1 constructs a new G1 instance.
func NewG1() *G1 {
	t := newTempG1()
	return &G1{t}
}

func newTempG1() tempG1 {
	t := [9]*fe{}
	for i := 0; i < 9; i++ {
		t[i] = &fe{}
	}
	return tempG1{t}
}

// Q returns group order of BN254 in big.Int
func (g *G1) Q() *big.Int {
	return new(big.Int).Set(q)
}

func (g *G1) fromBytesUnchecked(in []byte) (*PointG1, error) {
	p0, err := fromBytes(in[:32])
	if err != nil {
		return nil, err
	}
	p1, err := fromBytes(in[32:])
	if err != nil {
		return nil, err
	}
	p2 := new(fe).one()
	return &PointG1{*p0, *p1, *p2}, nil
}

// FromBytes constructs a new point given uncompressed byte input.
// FromBytes does not take zcash flags into account.
// Byte input expected to be larger than 64 bytes.
// First 64 bytes should be concatenation of x and y values.
// Point (0, 0) is considered as infinity.
func (g *G1) FromBytes(in []byte) (*PointG1, error) {
	if len(in) < 64 {
		return nil, errors.New("input string should be equal or larger than 64")
	}
	p0, err := fromBytes(in[:32])
	if err != nil {
		return nil, err
	}
	p1, err := fromBytes(in[32:])
	if err != nil {
		return nil, err
	}
	// check if given input points to infinity
	if p0.isZero() && p1.isZero() {
		return g.Zero(), nil
	}
	p2 := new(fe).one()
	p := &PointG1{*p0, *p1, *p2}
	if !g.IsOnCurve(p) {
		return nil, errors.New("point is not on curve")
	}
	return p, nil
}

// ToBytes serializes a point into bytes in uncompressed form.
// ToBytes does not take zcash flags into account.
// ToBytes returns (0, 0) if point is infinity.
func (g *G1) ToBytes(p *PointG1) []byte {
	out := make([]byte, 64)
	if g.IsZero(p) {
		return out
	}
	g.Affine(p)
	copy(out[:32], toBytes(&p[0]))
	copy(out[32:], toBytes(&p[1]))
	return out
}

// New creates a new G1 Point which is equal to zero in other words point at infinity.
func (g *G1) New() *PointG1 {
	return g.Zero()
}

// Zero returns a new G1 Point which is equal to point at infinity.
func (g *G1) Zero() *PointG1 {
	return new(PointG1).Zero()
}

// One returns a new G1 Point which is equal to generator point.
func (g *G1) One() *PointG1 {
	p := &PointG1{}
	return p.Set(&g1One)
}

// IsZero returns true if given point is equal to zero.
func (g *G1) IsZero(p *PointG1) bool {
	return p[2].isZero()
}

// Equal checks if given two G1 point is equal in their affine form.
func (g *G1) Equal(p1, p2 *PointG1) bool {
	if g.IsZero(p1) {
		return g.IsZero(p2)
	}
	if g.IsZero(p2) {
		return g.IsZero(p1)
	}
	t := g.t
	square(t[0], &p1[2])
	square(t[1], &p2[2])
	mul(t[2], t[0], &p2[0])
	mul(t[3], t[1], &p1[0])
	mul(t[0], t[0], &p1[2])
	mul(t[1], t[1], &p2[2])
	mul(t[1], t[1], &p1[1])
	mul(t[0], t[0], &p2[1])
	return t[0].equal(t[1]) && t[2].equal(t[3])
}

// InCorrectSubgroup checks whether given point is in correct subgroup.
func (g *G1) InCorrectSubgroup(p *PointG1) bool {
	tmp := &PointG1{}
	g.MulScalar(tmp, p, q)
	return g.IsZero(tmp)
}

// IsOnCurve checks a G1 point is on curve.
func (g *G1) IsOnCurve(p *PointG1) bool {
	if g.IsZero(p) {
		return true
	}
	t := g.t
	square(t[0], &p[1])
	square(t[1], &p[0])
	mul(t[1], t[1], &p[0])
	square(t[2], &p[2])
	square(t[3], t[2])
	mul(t[2], t[2], t[3])
	mul(t[2], b, t[2])
	add(t[1], t[1], t[2])
	return t[0].equal(t[1])
}

// IsAffine checks a G1 point whether it is in affine form.
func (g *G1) IsAffine(p *PointG1) bool {
	return p[2].isOne()
}

// Add adds two G1 points p1, p2 and assigns the result to point at first argument.
func (g *G1) Affine(p *PointG1) *PointG1 {
	if g.IsZero(p) {
		return p
	}
	if !g.IsAffine(p) {
		t := g.t
		inverse(t[0], &p[2])
		square(t[1], t[0])
		mul(&p[0], &p[0], t[1])
		mul(t[0], t[0], t[1])
		mul(&p[1], &p[1], t[0])
		p[2].one()
	}
	return p
}

// Add adds two G1 points p1, p2 and assigns the result to point at first argument.
func (g *G1) Add(r, p1, p2 *PointG1) *PointG1 {
	// http://www.hyperelliptic.org/EFD/gp/auto-shortw-jacobian-0.html#addition-add-2007-bl
	if g.IsZero(p1) {
		return r.Set(p2)
	}
	if g.IsZero(p2) {
		return r.Set(p1)
	}
	t := g.t
	square(t[7], &p1[2])
	mul(t[1], &p2[0], t[7])
	mul(t[2], &p1[2], t[7])
	mul(t[0], &p2[1], t[2])
	square(t[8], &p2[2])
	mul(t[3], &p1[0], t[8])
	mul(t[4], &p2[2], t[8])
	mul(t[2], &p1[1], t[4])
	if t[1].equal(t[3]) {
		if t[0].equal(t[2]) {
			return g.Double(r, p1)
		} else {
			return r.Zero()
		}
	}
	sub(t[1], t[1], t[3])
	double(t[4], t[1])
	square(t[4], t[4])
	mul(t[5], t[1], t[4])
	sub(t[0], t[0], t[2])
	double(t[0], t[0])
	square(t[6], t[0])
	sub(t[6], t[6], t[5])
	mul(t[3], t[3], t[4])
	double(t[4], t[3])
	sub(&r[0], t[6], t[4])
	sub(t[4], t[3], &r[0])
	mul(t[6], t[2], t[5])
	double(t[6], t[6])
	mul(t[0], t[0], t[4])
	sub(&r[1], t[0], t[6])
	add(t[0], &p1[2], &p2[2])
	square(t[0], t[0])
	sub(t[0], t[0], t[7])
	sub(t[0], t[0], t[8])
	mul(&r[2], t[0], t[1])
	return r
}

// Double doubles a G1 point p and assigns the result to the point at first argument.
func (g *G1) Double(r, p *PointG1) *PointG1 {
	// http://www.hyperelliptic.org/EFD/gp/auto-shortw-jacobian-0.html#doubling-dbl-2009-l
	if g.IsZero(p) {
		return r.Set(p)
	}
	t := g.t
	square(t[0], &p[0])
	square(t[1], &p[1])
	square(t[2], t[1])
	add(t[1], &p[0], t[1])
	square(t[1], t[1])
	sub(t[1], t[1], t[0])
	sub(t[1], t[1], t[2])
	double(t[1], t[1])
	double(t[3], t[0])
	add(t[0], t[3], t[0])
	square(t[4], t[0])
	double(t[3], t[1])
	sub(&r[0], t[4], t[3])
	sub(t[1], t[1], &r[0])
	double(t[2], t[2])
	double(t[2], t[2])
	double(t[2], t[2])
	mul(t[0], t[0], t[1])
	sub(t[1], t[0], t[2])
	mul(t[0], &p[1], &p[2])
	r[1].set(t[1])
	double(&r[2], t[0])
	return r
}

// Neg negates a G1 point p and assigns the result to the point at first argument.
func (g *G1) Neg(r, p *PointG1) *PointG1 {
	r[0].set(&p[0])
	r[2].set(&p[2])
	neg(&r[1], &p[1])
	return r
}

// Sub subtracts two G1 points p1, p2 and assigns the result to point at first argument.
func (g *G1) Sub(c, a, b *PointG1) *PointG1 {
	d := &PointG1{}
	g.Neg(d, b)
	g.Add(c, a, d)
	return c
}

// MulScalar multiplies a point by given scalar value in big.Int and assigns the result to point at first argument.
func (g *G1) MulScalar(c, p *PointG1, e *big.Int) *PointG1 {
	q, n := &PointG1{}, &PointG1{}
	n.Set(p)
	l := e.BitLen()
	for i := 0; i < l; i++ {
		if e.Bit(i) == 1 {
			g.Add(q, q, n)
		}
		g.Double(n, n)
	}
	return c.Set(q)
}

// MultiExp calculates multi exponentiation. Given pairs of G1 point and scalar values
// (P_0, e_0), (P_1, e_1), ... (P_n, e_n) calculates r = e_0 * P_0 + e_1 * P_1 + ... + e_n * P_n
// Length of points and scalars are expected to be equal, otherwise an error is returned.
// Result is assigned to point at first argument.
func (g *G1) MultiExp(r *PointG1, points []*PointG1, powers []*big.Int) (*PointG1, error) {
	if len(points) != len(powers) {
		return nil, errors.New("point and scalar vectors should be in same length")
	}
	var c uint32 = 3
	if len(powers) >= 32 {
		c = uint32(math.Ceil(math.Log10(float64(len(powers)))))
	}
	bucketSize, numBits := (1<<c)-1, uint32(g.Q().BitLen())
	windows := make([]*PointG1, numBits/c+1)
	bucket := make([]*PointG1, bucketSize)
	acc, sum := g.New(), g.New()
	for i := 0; i < bucketSize; i++ {
		bucket[i] = g.New()
	}
	mask := (uint64(1) << c) - 1
	j := 0
	var cur uint32
	for cur <= numBits {
		acc.Zero()
		bucket = make([]*PointG1, (1<<c)-1)
		for i := 0; i < len(bucket); i++ {
			bucket[i] = g.New()
		}
		for i := 0; i < len(powers); i++ {
			s0 := powers[i].Uint64()
			index := uint(s0 & mask)
			if index != 0 {
				g.Add(bucket[index-1], bucket[index-1], points[i])
			}
			powers[i] = new(big.Int).Rsh(powers[i], uint(c))
		}
		sum.Zero()
		for i := len(bucket) - 1; i >= 0; i-- {
			g.Add(sum, sum, bucket[i])
			g.Add(acc, acc, sum)
		}
		windows[j] = g.New()
		windows[j].Set(acc)
		j++
		cur += c
	}
	acc.Zero()
	for i := len(windows) - 1; i >= 0; i-- {
		for j := uint32(0); j < c; j++ {
			g.Double(acc, acc)
		}
		g.Add(acc, acc, windows[i])
	}
	return r.Set(acc), nil
}

// MapToPointTI applies try-and-increment method and maps given 32 bytes into G2 point
func (g *G1) MapToPointTI(in []byte) (*PointG1, error) {
	y := &fe{}
	x, err := fromBytesUnchecked(in)
	if err != nil {
		return nil, err
	}
	one := new(fe).one()
	for {
		square(y, x)
		mul(y, y, x)
		add(y, y, b)
		if ok := sqrt(y, y); ok {
			if !y.sign() {
				neg(y, y)
			}
			p := &PointG1{*x, *y, *one}
			return p, nil
		}
		add(x, x, one)
	}
}

// MapToPointTI applies Fouque Tibouchi map to point method
func (g *G1) MapToPointFT(in []byte) (*PointG1, error) {
	t, err := fromBytesUnchecked(in)
	if err != nil {
		return nil, err
	}
	return g.mapToPointFT(t)
}

// MapToPointTI applies Fouque Tibouchi map to point method
func (g *G1) mapToPointFT(t *fe) (*PointG1, error) {

	w, a, t2 := new(fe), new(fe), new(fe)

	square(t2, t)
	add(a, t2, b)
	add(a, a, one)

	st := new(fe)
	mul(st, sqrtMinus3, t)

	w0 := new(fe)
	mul(w0, st, a)
	inverse(w0, w0)

	square(w, st)
	mul(w, w, w0)

	e := isQuadraticNonResidue(t)
	y := new(fe)

	// x1
	tw, x1 := new(fe), new(fe)
	mul(tw, t, w)
	sub(x1, zz, tw)

	y.set(x1)
	square(y, x1)
	mul(y, y, x1)
	add(y, y, b)
	if sqrt(y, y) {
		if e {
			neg(y, y)
		}
		return &PointG1{*x1, *y, *one}, nil
	}

	// x2
	x2 := new(fe)
	sub(x2, negativeOne, x1)

	y.set(x2)
	square(y, x2)
	mul(y, y, x2)
	add(y, y, b)
	if sqrt(y, y) {
		if e {
			neg(y, y)
		}
		return &PointG1{*x2, *y, *one}, nil
	}

	// x3
	x3 := new(fe)
	square(x3, a)
	square(x3, x3)
	mul(x3, x3, w0)
	mul(x3, x3, w0)
	add(x3, x3, one)

	y.set(x3)
	square(y, x3)
	mul(y, y, x3)
	add(y, y, b)

	if !sqrt(y, y) {
		return nil, errors.New("bad implementation")
	}

	if e {
		neg(y, y)
	}
	return &PointG1{*x3, *y, *one}, nil
}

func (g *G1) HashToCurveFT(msg, domain []byte) (*PointG1, error) {
	hashRes, err := hashToFpXMDSHA256(msg, domain, 2)
	if err != nil {
		return nil, err
	}
	u0, u1 := hashRes[0], hashRes[1]
	p0, err := g.mapToPointFT(u0)
	if err != nil {
		return nil, err
	}
	p1, err := g.mapToPointFT(u1)
	if err != nil {
		return nil, err
	}
	g.Add(p0, p0, p1)
	return g.Affine(p0), nil
}
