import React from 'react'
import styled from 'styled-components'
import IconButton from '@material-ui/core/IconButton'
import Close from '@material-ui/icons/Close'

import Paragraph from 'src/components/layout/Paragraph'
import { md, lg } from 'src/theme/variables'
import Row from 'src/components/layout/Row'

const StyledParagraph = styled(Paragraph)`
  && {
    font-size: ${lg};
  }
`
const IconImg = styled.img`
  width: 20px;
  margin-right: 10px;
`
const TitleWrapper = styled.div`
  display: flex;
  align-items: center;
`

const StyledRow = styled(Row)`
  padding: ${md} ${lg};
  justify-content: space-between;
  box-sizing: border-box;
  max-height: 75px;
`

const StyledClose = styled(Close)`
  height: 35px;
  width: 35px;
`

const ModalTitle = ({
  iconUrl,
  title,
  onClose,
}: {
  title: string
  iconUrl: string
  onClose?: () => void
}): React.ReactElement => {
  return (
    <StyledRow align="center" grow>
      <TitleWrapper>
        {iconUrl && <IconImg alt={title} src={iconUrl} />}
        <StyledParagraph noMargin weight="bolder">
          {title}
        </StyledParagraph>
      </TitleWrapper>
      <IconButton disableRipple onClick={onClose}>
        <StyledClose />
      </IconButton>
    </StyledRow>
  )
}

export default ModalTitle
