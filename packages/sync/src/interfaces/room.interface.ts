export interface OnInit {
    onInit: () => void
}

export interface OnJoin {
    onJoin: (user: any) => void
}

export interface OnLeave {
    onLeave: (user: any) => void
}