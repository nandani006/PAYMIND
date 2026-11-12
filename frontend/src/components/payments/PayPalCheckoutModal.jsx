import { useState } from 'react'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  CreditCard,
  Loader2,
  Lock,
  Building2,
  Check,
  ExternalLink,
  Sparkles
} from 'lucide-react'
import { paymentsApi } from '../../services/api.js'
import { Button } from '../ui/button.jsx'
import { Badge } from '../ui/badge.jsx'
import { toast } from '../../hooks/useToast.js'
import { formatCurrency } from '../../utils/formatters.js'

export default function PayPalCheckoutModal({ isOpen, onClose, request, onSuccess }) {
  const [paymentState, setPaymentState] = useState('idle') // idle | creating_order | awaiting_approval | capturing | completed | failed
  const [errorMessage, setErrorMessage] = useState('')
  const [verifiedCapture, setVerifiedCapture] = useState(null)

  if (!isOpen || !request) return null

  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || ''
  const isConfigured = Boolean(clientId && clientId.trim() && clientId !== 'your-paypal-sandbox-client-id')

  async function handleCreateOrder() {
    setPaymentState('creating_order')
    setErrorMessage('')
    try {
      const res = await paymentsApi.createOrder({ request_id: request.id })
      setPaymentState('awaiting_approval')
      return res.data.order_id
    } catch (err) {
      setPaymentState('failed')
      const msg = err.response?.data?.message || err.message || 'Failed to initialize PayPal order.'
      setErrorMessage(msg)
      toast({
        title: 'Order Initialization Failed',
        description: msg,
        variant: 'destructive',
      })
      throw err
    }
  }

  async function handleApprove(data) {
    setPaymentState('capturing')
    setErrorMessage('')
    try {
      const res = await paymentsApi.captureOrder(data.orderID)
      setPaymentState('completed')
      setVerifiedCapture(res.data)
      toast({
        title: 'Disbursement Verified & Captured',
        description: `Successfully captured ${formatCurrency(res.data.amount, res.data.currency)} via PayPal Sandbox.`,
      })
      if (onSuccess) {
        onSuccess(res.data)
      }
    } catch (err) {
      setPaymentState('failed')
      const msg = err.response?.data?.message || err.message || 'Payment capture failed.'
      setErrorMessage(msg)
      toast({
        title: 'Capture Verification Failed',
        description: msg,
        variant: 'destructive',
      })
    }
  }

  function handleError(err) {
    setPaymentState('failed')
    const msg = err?.message || 'An error occurred during PayPal Checkout.'
    setErrorMessage(msg)
  }

  function handleModalClose() {
    if (paymentState === 'capturing' || paymentState === 'creating_order') return
    setPaymentState('idle')
    setErrorMessage('')
    setVerifiedCapture(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-modal max-w-lg w-full overflow-hidden border border-slate-200/90 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">PayPal Sandbox Disbursement</h3>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Orders v2
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Authorized B2B enterprise procurement release</p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            disabled={paymentState === 'capturing' || paymentState === 'creating_order'}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Order Snapshot Card */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Procurement Item
                </span>
                <p className="text-sm font-bold text-slate-900 leading-snug">{request.title}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500 pt-0.5">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-slate-400" />
                    {request.vendor}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>{request.category}</span>
                </div>
              </div>
              <Badge variant="success" className="text-[10px] uppercase font-bold tracking-wide shrink-0">
                Approved
              </Badge>
            </div>

            <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Approved Disbursement Amount:</span>
              <span className="text-xl font-bold font-mono text-slate-900">
                {formatCurrency(request.amount, request.currency || 'USD')}
              </span>
            </div>
          </div>

          {/* Dynamic Status Progress Banners */}
          {paymentState === 'creating_order' && (
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-xs text-indigo-900 flex items-center gap-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600 shrink-0" />
              <span>Establishing secure PayPal Sandbox session &amp; locking database transaction...</span>
            </div>
          )}

          {paymentState === 'awaiting_approval' && (
            <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Awaiting buyer authentication and authorization in PayPal Sandbox modal...</span>
            </div>
          )}

          {paymentState === 'capturing' && (
            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center gap-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600 shrink-0" />
              <span>Validating zero-trust matching and executing server-side capture...</span>
            </div>
          )}

          {paymentState === 'completed' && verifiedCapture && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>Disbursement Verified &amp; Captured!</span>
              </div>
              <p className="text-emerald-700 leading-relaxed text-[11px]">
                The transaction has been captured through the PayPal Orders v2 API and committed to the immutable Neon PostgreSQL audit trail.
              </p>
              <div className="bg-white/90 p-3 rounded-lg border border-emerald-100 text-[11px] font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Capture ID:</span>
                  <span className="font-bold text-slate-800">{verifiedCapture.capture_id || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">PayPal Order ID:</span>
                  <span className="font-bold text-slate-800">{verifiedCapture.order_id}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-500 font-sans">Settled Amount:</span>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(verifiedCapture.amount, verifiedCapture.currency)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {paymentState === 'failed' && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Payment Error</span>
                <span className="text-[11px]">{errorMessage || 'Unable to complete transaction.'}</span>
              </div>
            </div>
          )}

          {/* Checkout Action Zone */}
          {paymentState !== 'completed' ? (
            isConfigured ? (
              <div className="pt-2">
                <PayPalScriptProvider
                  options={{
                    clientId: clientId,
                    currency: (request.currency || 'USD').toUpperCase(),
                    intent: 'capture',
                  }}
                >
                  <PayPalButtons
                    style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 44 }}
                    disabled={paymentState === 'creating_order' || paymentState === 'capturing'}
                    createOrder={handleCreateOrder}
                    onApprove={handleApprove}
                    onError={handleError}
                    onCancel={() => setPaymentState('idle')}
                  />
                </PayPalScriptProvider>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  PayPal Sandbox Credentials Required
                </div>
                <p>
                  To enable live Sandbox payments, verify your PayPal Sandbox Client ID is defined in:
                </p>
                <code className="block bg-amber-100/70 p-2 rounded text-[11px] font-mono text-amber-950">
                  frontend/.env &rarr; VITE_PAYPAL_CLIENT_ID
                </code>
              </div>
            )
          ) : (
            <div className="pt-2">
              <Button onClick={handleModalClose} className="w-full text-xs h-10 bg-slate-900 hover:bg-slate-800">
                Close &amp; Return to Dashboard
              </Button>
            </div>
          )}

          {/* Security & Isolation Disclaimer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-500">
              <Lock className="h-3.5 w-3.5 text-emerald-600" /> Zero-Trust Server Capture
            </span>
            <span className="font-mono text-[10px]">PAYPAL SANDBOX US</span>
          </div>
        </div>
      </div>
    </div>
  )
}
