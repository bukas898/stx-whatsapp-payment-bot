;; P2P Escrow Smart Contract
;; Allows users to create escrow transactions with timeout and release mechanisms

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-already-exists (err u102))
(define-constant err-not-authorized (err u103))
(define-constant err-invalid-amount (err u104))
(define-constant err-escrow-locked (err u105))
(define-constant err-escrow-released (err u106))
(define-constant err-timeout-not-reached (err u107))
(define-constant err-already-released (err u108))
(define-constant err-already-refunded (err u109))

;; Data Variables
(define-data-var escrow-nonce uint u0)

;; Data Maps
(define-map escrows
  { escrow-id: uint }
  {
    sender: principal,
    recipient: principal,
    amount: uint,
    timeout-height: uint,
    status: (string-ascii 20),
    memo: (string-utf8 256),
    created-at: uint
  }
)

;; Private Functions
(define-private (get-next-escrow-id)
  (let ((current-nonce (var-get escrow-nonce)))
    (var-set escrow-nonce (+ current-nonce u1))
    current-nonce
  )
)

;; Public Functions

;; Create a new escrow
;; @param recipient: Principal who will receive the funds
;; @param amount: Amount in microSTX
;; @param timeout-blocks: Number of blocks until timeout (e.g., 144 blocks is about 24 hours);; @param memo: Optional memo/description
(define-public (create-escrow 
    (recipient principal) 
    (amount uint) 
    (timeout-blocks uint)
    (memo (string-utf8 256)))
  (let
    (
      (escrow-id (get-next-escrow-id))
      (timeout-height (+ block-height timeout-blocks))
    )
    ;; Validate amount
    (asserts! (> amount u0) err-invalid-amount)
    
    ;; Transfer STX from sender to contract
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    
    ;; Store escrow data
    (map-set escrows
      { escrow-id: escrow-id }
      {
        sender: tx-sender,
        recipient: recipient,
        amount: amount,
        timeout-height: timeout-height,
        status: "active",
        memo: memo,
        created-at: block-height
      }
    )
    
    ;; Return escrow ID
    (ok escrow-id)
  )
)

;; Release escrow to recipient
;; Can be called by sender or recipient
;; @param escrow-id: ID of the escrow to release
(define-public (release-escrow (escrow-id uint))
  (let
    (
      (escrow (unwrap! (map-get? escrows { escrow-id: escrow-id }) err-not-found))
      (sender (get sender escrow))
      (recipient (get recipient escrow))
      (amount (get amount escrow))
      (status (get status escrow))
    )
    ;; Check if caller is authorized (sender or recipient)
    (asserts! (or (is-eq tx-sender sender) (is-eq tx-sender recipient)) err-not-authorized)
    
    ;; Check if escrow is still active
    (asserts! (is-eq status "active") err-already-released)
    
    ;; Update escrow status
    (map-set escrows
      { escrow-id: escrow-id }
      (merge escrow { status: "released" })
    )
    
    ;; Transfer funds to recipient
    (as-contract (stx-transfer? amount tx-sender recipient))
  )
)

;; Refund escrow to sender after timeout
;; Can only be called after timeout-height is reached
;; @param escrow-id: ID of the escrow to refund
(define-public (refund-escrow (escrow-id uint))
  (let
    (
      (escrow (unwrap! (map-get? escrows { escrow-id: escrow-id }) err-not-found))
      (sender (get sender escrow))
      (amount (get amount escrow))
      (timeout-height (get timeout-height escrow))
      (status (get status escrow))
    )
    ;; Check if caller is the sender
    (asserts! (is-eq tx-sender sender) err-not-authorized)
    
    ;; Check if escrow is still active
    (asserts! (is-eq status "active") err-already-refunded)
    
    ;; Check if timeout has been reached
    (asserts! (>= block-height timeout-height) err-timeout-not-reached)
    
    ;; Update escrow status
    (map-set escrows
      { escrow-id: escrow-id }
      (merge escrow { status: "refunded" })
    )
    
    ;; Transfer funds back to sender
    (as-contract (stx-transfer? amount tx-sender sender))
  )
)

;; Cancel escrow (sender only, before recipient accepts)
;; @param escrow-id: ID of the escrow to cancel
(define-public (cancel-escrow (escrow-id uint))
  (let
    (
      (escrow (unwrap! (map-get? escrows { escrow-id: escrow-id }) err-not-found))
      (sender (get sender escrow))
      (amount (get amount escrow))
      (status (get status escrow))
    )
    ;; Only sender can cancel
    (asserts! (is-eq tx-sender sender) err-not-authorized)
    
    ;; Check if escrow is still active
    (asserts! (is-eq status "active") err-already-released)
    
    ;; Update escrow status
    (map-set escrows
      { escrow-id: escrow-id }
      (merge escrow { status: "cancelled" })
    )
    
    ;; Transfer funds back to sender
    (as-contract (stx-transfer? amount tx-sender sender))
  )
)

;; Read-only Functions

;; Get escrow details
;; @param escrow-id: ID of the escrow
(define-read-only (get-escrow (escrow-id uint))
  (map-get? escrows { escrow-id: escrow-id })
)

;; Get current escrow nonce (total escrows created)
(define-read-only (get-escrow-nonce)
  (ok (var-get escrow-nonce))
)

;; Check if escrow can be refunded (timeout reached)
;; @param escrow-id: ID of the escrow
(define-read-only (can-refund (escrow-id uint))
  (match (map-get? escrows { escrow-id: escrow-id })
    escrow
      (ok (and 
        (is-eq (get status escrow) "active")
        (>= block-height (get timeout-height escrow))
      ))
    (err err-not-found)
  )
)

;; Get escrow status
;; @param escrow-id: ID of the escrow
(define-read-only (get-status (escrow-id uint))
  (match (map-get? escrows { escrow-id: escrow-id })
    escrow (ok (get status escrow))
    (err err-not-found)
  )
)
