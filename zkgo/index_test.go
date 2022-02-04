package main

import (
	"testing"

	"github.com/mr-tron/base58"
	"github.com/stretchr/testify/require"
)

func TestBN254G1CompressedOK(t *testing.T) {
	tests := []struct {
		base58G1Uncompressed string
		base58G1Compressed   string
	}{
		{"W1R5uJqiQTr9PvAPG9LL4iH5zh6WQnZFUuxriYmTyS8xx6iPVhbf9E1JZ2913dNkaBSjmjogp9zzs6KABwDMkT7", "2geWr4Qa599a4maEK2BYJaXn7mvTHAQoZQsCHzrQQLUH"},
		{"YpWC6ty6YvmGPmVX5b7mEQumkxNE9FPdAxfecPfnPhyoKvnZCZJRR5YdqgckqsgA8bAVx4FE7UGcKeSyWSDFgZ8", "2r7X3D7zdDd6REx4b2mfRbr8QjejegDsG5YUcLKCRkHg"},
		{"W1R5uJqiQTr9PvAPG9LL4iH5zh6WQnZFUuxriYmTyS8xx6iPVhbf9E1JZ2913dNkaBSjmjogp9zzs6KABwDMkT7", "2geWr4Qa599a4maEK2BYJaXn7mvTHAQoZQsCHzrQQLUH"},
		{"j6WhdPC5X47Ps1NZbWLyWmPVE4zYFAW7n3V2VoquARVTqbEfe2iAoW74wFXturDyGu3bUkGMVZXLQprXfMLa5f5", "C4N3m8k5zrRsXhi2EfkmTE67hjmFFLC1awi8mJ95oYJ5"},
		{"Y7A5j5KzMWrBmm77yiCHZxFvzFkozPhaYxGj95NKfakLxemTc7g4e1QrvvrWTSMm6Lts4twPrJVkvkLS85bnAZY", "BRNX2fFJ8MaipAQXD53fJPcyQnf6qVGf7tw6a86ZcTZH"},
		{"awzeVUUdZFoEJgdqCZwEj8HJRcihtHdqJTxeCwAKGNFt5An4N9Xy1yvDrnVK3ndGMokrKQCtJcd2DLjkzSvZdyf", "2yHE1dVhVamwPKBdpKjQ9HkBFzMnDza5AePVqAqp7ERo"},
		{"CXg2hRXKDy5hP9Wtk1N7hHzKF6j2ZWN8r1MJHaX98J782KyFxBmyFR7sMHDhn4hLhZLtuxLwEjMo93KWVgcBnmx", "foxKEL13LCzDQv227Nf9pqhYd51xSDRHDgqQbrqqRso"},
	}
	for _, test := range tests {
		g1Uncompressed, err := base58.Decode(test.base58G1Uncompressed)
		require.NoError(t, err)
		expectedG1Compressed, err := base58.Decode(test.base58G1Compressed)
		require.NoError(t, err)

		actualG1Compressed := BN254G1Compressed(g1Uncompressed[:32], g1Uncompressed[32:])
		require.Equal(t, expectedG1Compressed, actualG1Compressed)
	}
}

func TestBN254G2CompressedOK(t *testing.T) {
	tests := []struct {
		base58G2Uncompressed string
		base58G2Compressed   string
	}{
		{"9JtQ3bauWsde3kT2sJmTxmiJTAp45XCinojmMNhZJDHenqrsSD79nNrD5hTWk5GjB9FUBcFhDiN9bpbKuvn85qRzH1fdYMbNZbiVu61GBNRMHceaVk4aoKn9MvGopysWQSLhSwa3mWyTByeqQPySCoDzaCYo2G1eRe9NCTzTP6YHgz", "3b44h56wxRUuBdboxa55DmqStxCqTS32sTqhGuUn4VaSsSp491FbJnwc6UwyEqsysevdZXeUjTxtv6NWaH9ked5D"},
		{"3tzh7u41HgpVaqK3xtvW5VM33XSJ9VsSjUMyN8bnrnubKpcnpzvFqFBdhTH9cYY2vpoteuZ7ivG1rNPAABEBLrhWvgi2tmMpkE9cEFK7JCiz7kwTQ1nZayQDG2hE8PyX3E84fnMAwCQKGnw7GULMHunysRWKkZpUf9XLB4e1aAY2NDn", "ZpiHPEYopuvXY7d5cPPNtcNBAZ6tMPgtbR2osJiMCzqvtjFVSx6t1fvEmCgXbHD5cMY38ShEF7kyDWktx67GcLJ"},
		{"9JtQ3bauWsde3kT2sJmTxmiJTAp45XCinojmMNhZJDHenqrsSD79nNrD5hTWk5GjB9FUBcFhDiN9bpbKuvn85qRzH1fdYMbNZbiVu61GBNRMHceaVk4aoKn9MvGopysWQSLhSwa3mWyTByeqQPySCoDzaCYo2G1eRe9NCTzTP6YHgz", "3b44h56wxRUuBdboxa55DmqStxCqTS32sTqhGuUn4VaSsSp491FbJnwc6UwyEqsysevdZXeUjTxtv6NWaH9ked5D"},
		{"4zM36g7p5v55zP1bypKeHZV5THzQpY8QoDv9ZrzUzMLaXX1cn4x222EfhXKpw4BZmSwavpHkwdH4dgZN9NjPCfNzcav8fyMZN7pDp1xy87p9Yg3ZfZhQwpF1EymdsVNCFihYE82Rkpek91B95XRuKXkoj7puBhQBaw6zcLp18ggbxnz", "nCbsFpcyG7YSY4jT61dGpKuLRHve56ikH3dHRDvz75NUBwdtPVLpkFoY77Jh6bctAHF6ttoiymF67rgaPHtitfi"},
		{"3ZLAuiCKpJih3poPxXcb7fkdTuKdmG3Dpq6h4Q9AxvYta5Cq7U6UYSjp8LzpxfJPpQthmYo3sLH729GcpvkVHC37GkKPmuNUBqnpgp7oLyc5zNEHJYgQjRmmGMyLbcQG2GMZmreEf3JKYQq3H42H2nXw9mGMBebS6pvERpRitNeDrLz", "44QntwfDrWeCme2EfxuCfaMswrq9Cn6aNCoetY9T7DLZoZRc45bTSUYXZ8JkPiTMQpU8p2xWQ896XEYkrajUNsx5"},
		{"2ZwGn8CzFa6tpNYZL3xjWfbe9vWUDsVmXA6TfjdJhPMATdTgBn8vDqDnSShvvL3rLksBRMLvYjM2pFJNCbdmgmz1Ko39W8nmTE8gnYWjxs1PnqhPvxzMLav25scnAdzTH2u13CnDn1zpsyKFsVS3gcuw62FRd15GKgaqco939uqiVK7", "3sCPtpoWvbpUsoh458pYr9Lak6MeKo7S1aThUNqaCAXiaciYYJnvKsRhJ5x4bYZM5FQYyWkFq3JaP6WmTXFsg6sv"},
		{"2waqSh7Mv9Bza9RLT4ke3SxtJJ3HFTDH1L3dr36jCq2ncqij2fqWR2HVHn7k5AC3YQsU8pEW7PPV5zBKtXGRuPZXxMktEBuG5ZZt6moYYk3cYTrCwFXu2cexpqqvYKydr1TL5bTeAtSBeZJaWonARFiPiuan48Z6BqxD9D3QrGhriji", "NznwN8tGGaJeToVK5U2y9CPok2t5MkfGbYv7aZQc2nuQ6cZzJ7iEPQmaMJEWJscK5y89PkWYwCkpomqW4fsJYm5"},
	}
	for _, test := range tests {
		g2Uncompressed, err := base58.Decode(test.base58G2Uncompressed)
		require.NoError(t, err)
		expectedG2Compressed, err := base58.Decode(test.base58G2Compressed)
		require.NoError(t, err)

		actualG2Compressed := BN254G2Compressed(g2Uncompressed[:64], g2Uncompressed[64:])
		require.Equal(t, expectedG2Compressed, actualG2Compressed)
	}
}
